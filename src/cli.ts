#!/usr/bin/env node

import { select, confirm, Separator } from '@inquirer/prompts';
import { loadConfig, saveConfig, getGlobalConfigPath, getProjectConfigPath } from './config.js';
import { listAvailableSounds, playSound } from './sound.js';
import { EventType, PluginConfig, DEFAULT_CONFIG } from './types.js';

const EVENTS: { key: EventType; label: string; description: string }[] = [
  { key: 'complete', label: 'Task Complete', description: 'When OpenCode finishes a task' },
  { key: 'error', label: 'Error', description: 'When an error occurs' },
  { key: 'question', label: 'Question', description: 'When OpenCode needs input' },
  { key: 'permission', label: 'Permission', description: 'When permission is required' },
  { key: 'subagent_complete', label: 'Subagent Complete', description: 'When a subagent finishes' }
];

async function listSounds() {
  console.log('\n🔊 Available macOS System Sounds:\n');
  const sounds = listAvailableSounds();
  sounds.forEach((sound, index) => {
    console.log(`  ${index + 1}. ${sound}`);
  });
  console.log();
}

async function previewSound() {
  const sounds = listAvailableSounds();
  
  const sound = await select({
    message: 'Select a sound to preview:',
    choices: sounds.map(s => ({ name: s, value: s }))
  });
  
  console.log(`\n🔊 Playing ${sound}...`);
  await playSound(sound);
  console.log('✅ Done\n');
}

async function configure() {
  const isGlobal = await confirm({
    message: 'Configure globally (for all projects)?',
    default: true
  });
  
  const config = loadConfig();
  const sounds = listAvailableSounds();
  
  console.log('\n🎵 Configure Sounds for Each Event:\n');
  
  for (const event of EVENTS) {
    const currentSound = config.sounds[event.key];
    
    const sound = await select({
      message: `${event.label} (${event.description}):`,
      default: currentSound,
      choices: [
        new Separator(),
        ...sounds.map(s => ({ name: s, value: s })),
        new Separator()
      ]
    });
    
    config.sounds[event.key] = sound;
    
    // Preview the selected sound
    console.log(`  Previewing ${sound}...`);
    await playSound(sound);
  }
  
  // Configure global toggles
  console.log('\n⚙️  Global Settings:\n');
  
  config.sound = await confirm({
    message: 'Enable sounds?',
    default: config.sound
  });
  
  config.notification = await confirm({
    message: 'Enable visual notifications?',
    default: config.notification
  });
  
  config.showProjectName = await confirm({
    message: 'Show project name in notifications?',
    default: config.showProjectName
  });
  
  // Save configuration
  saveConfig(config, isGlobal);
  
  const configPath = isGlobal ? getGlobalConfigPath() : getProjectConfigPath();
  console.log(`\n✅ Configuration saved to: ${configPath}\n`);
}

async function reset() {
  const isGlobal = await confirm({
    message: 'Reset global configuration to defaults?',
    default: true
  });
  
  saveConfig(DEFAULT_CONFIG, isGlobal);
  console.log('\n✅ Configuration reset to defaults\n');
}

async function showCurrent() {
  const config = loadConfig();
  
  console.log('\n📋 Current Configuration:\n');
  console.log('  Global Settings:');
  console.log(`    Sounds: ${config.sound ? '✅' : '❌'}`);
  console.log(`    Notifications: ${config.notification ? '✅' : '❌'}`);
  console.log(`    Show Project Name: ${config.showProjectName ? '✅' : '❌'}`);
  console.log('\n  Event Sounds:');
  
  for (const event of EVENTS) {
    console.log(`    ${event.label}: ${config.sounds[event.key]}`);
  }
  
  console.log(`\n  Global config: ${getGlobalConfigPath()}`);
  console.log(`  Project config: ${getProjectConfigPath()}`);
  console.log();
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'list':
      await listSounds();
      break;
    case 'preview':
      await previewSound();
      break;
    case 'config':
    case 'configure':
      await configure();
      break;
    case 'reset':
      await reset();
      break;
    case 'show':
    case 'current':
      await showCurrent();
      break;
    default:
      console.log(`
🔔 OpenCode Notification macOS

Usage:
  npx opencode-notification-macos <command>

Commands:
  list              List all available macOS system sounds
  preview           Preview a sound
  config            Configure sounds and settings interactively
  reset             Reset configuration to defaults
  show              Show current configuration

Examples:
  npx opencode-notification-macos config
  npx opencode-notification-macos preview
  npx opencode-notification-macos list

Configuration files:
  Global: ~/.config/opencode/opencode-notification-macos.json
  Project: .opencode/notification.json
`);
  }
}

main().catch(console.error);
