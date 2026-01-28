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
    // Silently fail - notifications shouldn't break workflow
  }
}

export async function showNotification(title: string, message: string): Promise<void> {
  try {
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedMessage = message.replace(/"/g, '\\"');
    await execAsync(`osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}"'`);
  } catch (e) {
    // Silently fail
  }
}

export async function handleEvent(
  eventType: EventType,
  projectName: string | null,
  config: { sound: boolean; notification: boolean; showProjectName: boolean; messages: Record<EventType, string>; sounds: SoundConfig }
): Promise<void> {
  const title = config.showProjectName && projectName 
    ? `OpenCode (${projectName})` 
    : 'OpenCode';
  
  const message = config.messages[eventType];
  
  // Show notification
  if (config.notification) {
    await showNotification(title, message);
  }
  
  // Play sound
  if (config.sound) {
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
