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

    void (async () => {
      const types = ['session.idle', 'session.execution.failed', 'permission.asked'] as const;
      for await (const event of ctx.event.subscribe({ types: [...types], signal: controller.signal }) as AsyncIterable<Event>) {
        if (controller.signal.aborted) return;

        if (event.type === 'permission.asked') {
          await handleEvent('permission', projectName, config);
        }

        if (event.type === 'session.execution.failed') {
          await handleEvent('error', projectName, config);
        }

        if (event.type === 'session.idle') {
          const sessionID = getSessionIDFromEvent(event);
          if (sessionID) {
            const isChild = await isChildSession(ctx, sessionID);
            if (isChild) {
              await handleEvent('subagent_complete', projectName, config);
            } else {
              await handleEvent('complete', projectName, config);
            }
          } else {
            await handleEvent('complete', projectName, config);
          }
        }
      }
    })();

    void ctx.tool.hook('execute.before', async (input) => {
      if (input.tool === 'question') {
        await handleEvent('question', projectName, config);
      }
    });

    return () => controller.abort();
  },
});
