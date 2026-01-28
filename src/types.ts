export interface SoundConfig {
  complete: string;
  error: string;
  question: string;
  permission: string;
  subagent_complete: string;
}

export interface EventConfig {
  sound: boolean;
  notification: boolean;
}

export interface PluginConfig {
  sound: boolean;
  notification: boolean;
  showProjectName: boolean;
  events: {
    complete: EventConfig;
    error: EventConfig;
    question: EventConfig;
    permission: EventConfig;
    subagent_complete: EventConfig;
  };
  messages: {
    complete: string;
    error: string;
    question: string;
    permission: string;
    subagent_complete: string;
  };
  sounds: SoundConfig;
}

export type EventType = 'complete' | 'error' | 'question' | 'permission' | 'subagent_complete';

export const SYSTEM_SOUNDS = [
  'Basso',
  'Blow',
  'Bottle',
  'Frog',
  'Funk',
  'Glass',
  'Hero',
  'Morse',
  'Ping',
  'Pop',
  'Purr',
  'Sosumi',
  'Submarine',
  'Tink'
] as const;

export const DEFAULT_CONFIG: PluginConfig = {
  sound: true,
  notification: true,
  showProjectName: true,
  events: {
    complete: { sound: true, notification: true },
    error: { sound: true, notification: true },
    question: { sound: true, notification: true },
    permission: { sound: true, notification: true },
    subagent_complete: { sound: false, notification: false }
  },
  messages: {
    complete: '✅ Task completed',
    error: '❌ Error occurred',
    question: '❓ OpenCode needs your input',
    permission: '🔐 Permission required',
    subagent_complete: 'Subagent finished'
  },
  sounds: {
    complete: 'Glass',
    error: 'Basso',
    question: 'Ping',
    permission: 'Tink',
    subagent_complete: 'Pop'
  }
};
