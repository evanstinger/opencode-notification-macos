#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SYSTEM_SOUNDS_PATH = '/System/Library/Sounds';

const DEFAULT_CONFIG = {
  sound: true,
  notification: true,
  showProjectName: true,
  sounds: {
    complete: 'Glass',
    error: 'Basso',
    question: 'Ping',
    permission: 'Tink',
    subagent_complete: 'Pop'
  }
};

function getGlobalConfigPath() {
  return join(homedir(), '.config', 'opencode', 'opencode-notification-macos.json');
}

function listAvailableSounds() {
  return [
    'Basso', 'Blow', 'Bottle', 'Frog', 'Funk', 'Glass',
    'Hero', 'Morse', 'Ping', 'Pop', 'Purr', 'Sosumi',
    'Submarine', 'Tink'
  ];
}

async function playSound(soundName: string) {
  const soundPath = join(SYSTEM_SOUNDS_PATH, `${soundName}.aiff`);
  try {
    await execAsync(`afplay "${soundPath}"`);
  } catch (e) {
    // Silently fail
  }
}

async function listSounds() {
  console.log('\n🔊 Available macOS System Sounds:\n');
  const sounds = listAvailableSounds();
  sounds.forEach((sound, index) => {
    console.log(`  ${index + 1}. ${sound}`);
  });
  console.log();
}

async function previewSound(args: string[]) {
  const soundIndex = parseInt(args[0]) - 1;
  const sounds = listAvailableSounds();
  
  if (isNaN(soundIndex) || soundIndex < 0 || soundIndex >= sounds.length) {
    console.log('\n🔊 Available sounds:\n');
    sounds.forEach((sound, index) => {
      console.log(`  ${index + 1}. ${sound}`);
    });
    console.log('\nUsage: npx opencode-notification-macos preview <number>');
    console.log('Example: npx opencode-notification-macos preview 6\n');
    return;
  }
  
  const sound = sounds[soundIndex];
  console.log(`\n🔊 Playing ${sound}...`);
  await playSound(sound);
  console.log('✅ Done\n');
}

async function showConfig() {
  const configPath = getGlobalConfigPath();
  
  if (!existsSync(configPath)) {
    console.log('\n⚙️  No configuration found. Using defaults:\n');
    console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(`\nConfig path: ${configPath}\n`);
    return;
  }
  
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    console.log('\n📋 Current Configuration:\n');
    console.log(JSON.stringify(config, null, 2));
    console.log(`\nConfig path: ${configPath}\n`);
  } catch (e) {
    console.error('❌ Error reading config:', e);
  }
}

async function resetConfig() {
  const configPath = getGlobalConfigPath();
  try {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log('\n✅ Configuration reset to defaults\n');
    console.log(`Config saved to: ${configPath}\n`);
  } catch (e) {
    console.error('❌ Error saving config:', e);
  }
}

async function setSound(args: string[]) {
  const [event, soundName] = args;
  const validEvents = ['complete', 'error', 'question', 'permission', 'subagent_complete'];
  const validSounds = listAvailableSounds();
  
  if (!event || !soundName) {
    console.log('\nUsage: npx opencode-notification-macos set-sound <event> <sound>');
    console.log('\nValid events:', validEvents.join(', '));
    console.log('Valid sounds:', validSounds.join(', '));
    console.log('\nExample: npx opencode-notification-macos set-sound complete Glass\n');
    return;
  }
  
  if (!validEvents.includes(event)) {
    console.error(`❌ Invalid event: ${event}`);
    console.log('Valid events:', validEvents.join(', '));
    return;
  }
  
  if (!validSounds.includes(soundName)) {
    console.error(`❌ Invalid sound: ${soundName}`);
    console.log('Valid sounds:', validSounds.join(', '));
    return;
  }
  
  const configPath = getGlobalConfigPath();
  let config = DEFAULT_CONFIG;
  
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch (e) {
      // Use defaults
    }
  }
  
  config.sounds[event as keyof typeof config.sounds] = soundName;
  
  try {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`\n✅ Set ${event} sound to ${soundName}\n`);
    
    // Preview the sound
    console.log(`🔊 Previewing ${soundName}...`);
    await playSound(soundName);
  } catch (e) {
    console.error('❌ Error saving config:', e);
  }
}

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  switch (command) {
    case 'list':
      await listSounds();
      break;
    case 'preview':
      await previewSound(args);
      break;
    case 'config':
    case 'show':
      await showConfig();
      break;
    case 'reset':
      await resetConfig();
      break;
    case 'set-sound':
      await setSound(args);
      break;
    default:
      console.log(`
🔔 OpenCode Notification macOS

Usage:
  npx opencode-notification-macos <command> [options]

Commands:
  list                          List all available macOS system sounds
  preview <number>              Preview a sound by number (1-14)
  config, show                  Show current configuration
  reset                         Reset configuration to defaults
  set-sound <event> <sound>     Set sound for an event

Examples:
  npx opencode-notification-macos list
  npx opencode-notification-macos preview 6
  npx opencode-notification-macos set-sound complete Glass
  npx opencode-notification-macos set-sound error Basso

Configuration file:
  ~/.config/opencode/opencode-notification-macos.json

Events:
  complete          - Task completed
  error             - Error occurred
  question          - OpenCode needs input
  permission        - Permission required
  subagent_complete - Subagent task finished
`);
  }
}

main().catch(console.error);
