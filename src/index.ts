import { loadConfig } from './config.js';
import { handleEvent } from './sound.js';
import { EventType } from './types.js';

interface PluginContext {
  client: {
    session: {
      get: (params: { path: { id: string } }) => Promise<{ data?: { parentID?: string } }>;
    };
  };
  directory: string;
}

interface Event {
  type: string;
  data?: {
    sessionID?: string;
    id?: string;
  };
  sessionID?: string;
}

function getSessionIDFromEvent(event: Event): string | null {
  return event.data?.sessionID || event.sessionID || event.data?.id || null;
}

async function isChildSession(client: PluginContext['client'], sessionID: string): Promise<boolean> {
  try {
    const response = await client.session.get({ path: { id: sessionID } });
    return !!response.data?.parentID;
  } catch {
    return false;
  }
}

async function opencodeNotificationMacOS({ client, directory }: PluginContext) {
  const config = loadConfig();
  const projectName = directory ? directory.split('/').pop() || null : null;
  
  return {
    event: async ({ event }: { event: Event }) => {
      // Permission events
      if (event.type === 'permission.updated' || event.type === 'permission.asked') {
        await handleEvent('permission', projectName, config);
      }
      
      // Session completion
      if (event.type === 'session.idle') {
        const sessionID = getSessionIDFromEvent(event);
        if (sessionID) {
          const isChild = await isChildSession(client, sessionID);
          const eventType: EventType = isChild ? 'subagent_complete' : 'complete';
          await handleEvent(eventType, projectName, config);
        } else {
          await handleEvent('complete', projectName, config);
        }
      }
      
      // Error events
      if (event.type === 'session.error') {
        await handleEvent('error', projectName, config);
      }
    },
    
    'permission.ask': async () => {
      await handleEvent('permission', projectName, config);
    },
    
    'tool.execute.before': async (input: { tool: string }) => {
      if (input.tool === 'question') {
        await handleEvent('question', projectName, config);
      }
    }
  };
}

export = opencodeNotificationMacOS;
