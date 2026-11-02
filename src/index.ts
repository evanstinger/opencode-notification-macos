import { Plugin } from '@opencode/plugin';
import { loadConfig } from './config.js';
import { handleEvent } from './sound.js';

interface EventProps {
  sessionID?: string;
  id?: string;
}

interface Event {
  type: string;
  data?: EventProps;
  properties?: EventProps;
  sessionID?: string;
}

function getSessionIDFromEvent(event: Event): string | null {
  return event.data?.sessionID || event.properties?.sessionID || event.sessionID || event.data?.id || null;
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

    const controller = new AbortController();
    const thisIdleSessions = new Set<string>();

    const debug = process.env.ONM_DEBUG === "1";
    const probe = "/tmp/onm-debug.log";
    const log = (...args: unknown[]) => {
      if (!debug) return;
      const line = new Date().toISOString() + " [onm] " + args.map((a) => typeof a === "string" ? a : JSON.stringify(a)).join(" ") + "\n";
      import('fs').then((fs) => fs.appendFileSync(probe, line)).catch(() => {});
    };

    void (async () => {
      const types = ['session.idle', 'session.status', 'session.execution.failed', 'permission.asked'] as const;
      try {
        for await (const event of ctx.event.subscribe({ types: [...types], signal: controller.signal }) as AsyncIterable<Event>) {
          if (controller.signal.aborted) return;
          if (debug) log("event", event.type, JSON.stringify(getSessionIDFromEvent(event)));

          if (event.type === 'permission.asked') {
            await handleEvent('permission', projectName, config);
          }

          if (event.type === 'session.execution.failed') {
            await handleEvent('error', projectName, config);
          }

          const statusEvent = event as Event & { data?: EventProps & { status?: { type?: string } } };
          const idle = event.type === 'session.idle' || (event.type === 'session.status' && statusEvent.data?.status?.type === 'idle');
          if (idle) {
            const sessionID = getSessionIDFromEvent(event);
            if (sessionID && !thisIdleSessions.has(sessionID)) {
              thisIdleSessions.add(sessionID);
              const isChild = await isChildSession(ctx, sessionID);
              if (isChild) {
                await handleEvent('subagent_complete', projectName, config);
              } else {
                await handleEvent('complete', projectName, config);
              }
            } else if (!sessionID) {
              await handleEvent('complete', projectName, config);
            }
          }
        }
        if (debug) log("event stream ended");
      } catch (e) {
        console.error("[onm] subscribe loop error:", e instanceof Error ? e.stack || e.message : e);
      }
    })();

    void ctx.tool.hook('execute.before', async (input) => {
      if (debug) log("tool.before", input.tool);
      if (input.tool === 'question') {
        await handleEvent('question', projectName, config);
      }
    }).catch((e) => console.error("[onm] tool hook register failed:", e));

    log("setup done, watching events");

    return () => controller.abort();
  },
});
