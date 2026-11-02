import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import { SoundConfig, EventType } from './types.js';

const execAsync = promisify(exec);

const SYSTEM_SOUNDS_PATH = '/System/Library/Sounds';

export function getSoundPath(soundName: string): string {
  // Try system sounds
  const systemPath = join(SYSTEM_SOUNDS_PATH, `${soundName}.aiff`);
  if (existsSync(systemPath)) {
    return systemPath;
  }
  
  // Fallback to Glass
  return join(SYSTEM_SOUNDS_PATH, 'Glass.aiff');
}

export async function playSound(soundName: string): Promise<void> {
  const soundPath = getSoundPath(soundName);
  
  try {
    await execAsync(`afplay "${soundPath}"`);
  } catch (e) {
    console.error('[opencode-notification-macos] afplay failed:', e instanceof Error ? e.message : e);
  }
}

export async function showNotification(title: string, message: string): Promise<void> {
  try {
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedMessage = message.replace(/"/g, '\\"');
    await execAsync(`osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}"'`);
  } catch (e) {
    console.error('[opencode-notification-macos] osascript failed:', e instanceof Error ? e.message : e);
  }
}

export async function handleEvent(
  eventType: EventType,
  projectName: string | null,
  config: { 
    sound: boolean; 
    notification: boolean; 
    showProjectName: boolean; 
    messages: Record<EventType, string>; 
    sounds: SoundConfig;
    events?: Record<EventType, { sound: boolean; notification: boolean }>;
  }
): Promise<void> {
  if (process.env.ONM_DEBUG === "1") {
    import('fs').then((fs) => fs.appendFileSync('/tmp/onm-debug.log', new Date().toISOString() + ' [onm] handleEvent ' + eventType + '\n')).catch(() => {});
  }
  const title = config.showProjectName && projectName 
    ? `OpenCode (${projectName})` 
    : 'OpenCode';
  
  const message = config.messages[eventType];
  
  const eventConfig = config.events?.[eventType];
  const shouldNotify = config.notification && (eventConfig?.notification !== false);
  const shouldPlaySound = config.sound && (eventConfig?.sound !== false);
  
  // Show notification
  if (shouldNotify) {
    await showNotification(title, message);
  }
  
  // Play sound
  if (shouldPlaySound) {
    const soundName = config.sounds[eventType];
    await playSound(soundName);
  }
}

export function listAvailableSounds(): string[] {
  return [
    'Basso', 'Blow', 'Bottle', 'Frog', 'Funk', 'Glass',
    'Hero', 'Morse', 'Ping', 'Pop', 'Purr', 'Sosumi',
    'Submarine', 'Tink'
  ];
}
