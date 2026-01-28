import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { PluginConfig, DEFAULT_CONFIG } from './types.js';

export function getGlobalConfigPath(): string {
  return join(homedir(), '.config', 'opencode', 'opencode-notification-macos.json');
}

export function getProjectConfigPath(): string {
  return join(process.cwd(), '.opencode', 'notification.json');
}

export function loadConfig(): PluginConfig {
  const globalPath = getGlobalConfigPath();
  const projectPath = getProjectConfigPath();
  
  let config = { ...DEFAULT_CONFIG };
  
  // Load global config
  if (existsSync(globalPath)) {
    try {
      const globalConfig = JSON.parse(readFileSync(globalPath, 'utf8'));
      config = mergeConfig(config, globalConfig);
    } catch (e) {
      console.error('[opencode-notification-macos] Failed to load global config:', e);
    }
  }
  
  // Load project config (overrides global)
  if (existsSync(projectPath)) {
    try {
      const projectConfig = JSON.parse(readFileSync(projectPath, 'utf8'));
      config = mergeConfig(config, projectConfig);
    } catch (e) {
      console.error('[opencode-notification-macos] Failed to load project config:', e);
    }
  }
  
  return config;
}

export function saveConfig(config: PluginConfig, isGlobal: boolean = true): void {
  const configPath = isGlobal ? getGlobalConfigPath() : getProjectConfigPath();
  
  try {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('[opencode-notification-macos] Failed to save config:', e);
    throw e;
  }
}

function mergeConfig(base: PluginConfig, override: Partial<PluginConfig>): PluginConfig {
  return {
    ...base,
    ...override,
    events: { ...base.events, ...override.events },
    messages: { ...base.messages, ...override.messages },
    sounds: { ...base.sounds, ...override.sounds }
  };
}
