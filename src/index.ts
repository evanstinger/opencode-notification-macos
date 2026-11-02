import { Plugin } from '@opencode/plugin';
import { loadConfig } from './config.js';
import { handleEvent } from './sound.js';

interface Event {
  type: string;
  data?: { sessionID?: string; id?: string };
}

async function isChildSession(ctx: { session: { get: (input: { sessionID: string }) => Promise<any> } }, sessionID: string): Promise<boolean> {
  try {
    const response = await ctx.session.get({ sessionID });
    const session = response?.data ?? response;
    return !!session?.parentID;
  } catch {
    return false;
  }
}

export default Plugin.define({
  id: 'opencode-notification-macos',
  setup(ctx) {
    const config = loadConfig();
    const directory = ctx.location?.directory ?? process.cwd();
    const projectName = directory ? directory.split('/').pop() || null : null;

    const debug = process.env.ONM_DEBUG === "1";
    const probe = "/tmp/onm-debug.log";
    const log = (...args: unknown[]) => {
      if (!debug) return;
      const line = new Date().toISOString() + " [onm] " + args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ") + "\n";
      import('fs').then((fs) => fs.appendFileSync(probe, line)).catch(() => {});
    };

    // In-process hooks are the primary signal path in v2. The
    // ctx.event.subscribe stream can stay silent in fresh server
    // instances, so it is only kept as a fallback for execution
    // failures (which have no session hook).
    const controller = new AbortController();

    // Dedupe idle notifications per session, reset when a new prompt
    // starts so every run notifies exactly once.
    const notifiedIdle = new Set<string>();

    const notifyIdle = async (sessionID: string | undefined) => {
      if (sessionID) {
        if (notifiedIdle.has(sessionID)) return;
        notifiedIdle.add(sessionID);
        const isChild = await isChildSession(ctx, sessionID);
        await handleEvent(isChild ? 'subagent_complete' : 'complete', projectName, config);
      } else {
        await handleEvent('complete', projectName, config);
      }
    };

    void Promise.all([
      ctx.session.hook('prompt', (input) => {
        if (debug) log("session.prompt", String(input.sessionID));
        notifiedIdle.delete(String(input.sessionID));
      }),
      ctx.session.hook('experimental.idle', (input) => {
        if (debug) log("session.idle.hook", String(input.sessionID));
        return notifyIdle(String(input.sessionID));
      }),
      ctx.tool.hook('execute.before', (input) => {
        if (debug) log("tool.before", input.tool);
        if (input.tool === 'question') {
          return handleEvent('question', projectName, config);
        }
      }),
      ctx.permission.hook('evaluate', (input) => {
        if (debug) log("permission.evaluate", input.effect, input.action);
        if (input.effect === 'ask') {
          return handleEvent('permission', projectName, config);
        }
      }),
    ]).catch((e) => console.error("[onm] hook register failed:", e));

    void (async () => {
      // Fallback path: error events. In debug mode subscribe unfiltered
      // to diagnose whether the event stream carries anything at all.
      const types: readonly string[] | undefined = debug ? undefined : ['session.execution.failed'];
      // EventType union is opaque here; widening the signature to string[]
      // so the debug unfiltered subscribe type-checks alongside the filtered one.
      type EventSubscribe = (options?: { types?: readonly string[]; signal?: AbortSignal }) => AsyncIterable<Event>;
      const subscribe = ctx.event.subscribe as unknown as EventSubscribe;
      try {
        for await (const event of subscribe({ types, signal: controller.signal })) {
          if (controller.signal.aborted) return;
          if (debug) log("event", event.type);
          if (event.type === 'session.execution.failed') {
            await handleEvent('error', projectName, config);
          }
        }
        if (debug) log("event stream ended");
      } catch (e) {
        console.error("[onm] subscribe loop error:", e instanceof Error ? e.stack || e.message : e);
      }
    })();

    log("setup done, hooks registered");

    return () => controller.abort();
  },
});
