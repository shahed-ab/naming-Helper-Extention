import * as vscode from 'vscode';
import { NamingHelperConfig, DEFAULT_CONFIG } from './types';

/**
 * Retrieves the current extension configuration from VS Code workspace settings.
 *
 * @returns Complete NamingHelperConfig with defaults populated for missing keys
 */
export function getConfig(): NamingHelperConfig {
  const wsConfig = vscode.workspace.getConfiguration('namingHelper');

  return {
    enable: wsConfig.get<boolean>('enable', DEFAULT_CONFIG.enable),
    severity: wsConfig.get<'Hint' | 'Information' | 'Warning'>(
      'severity',
      DEFAULT_CONFIG.severity
    ),
    confidenceThreshold: wsConfig.get<number>(
      'confidenceThreshold',
      DEFAULT_CONFIG.confidenceThreshold
    ),
    blocklist: wsConfig.get<string[]>('blocklist', DEFAULT_CONFIG.blocklist),
    allowedSingleLetters: wsConfig.get<string[]>(
      'allowedSingleLetters',
      DEFAULT_CONFIG.allowedSingleLetters
    ),
    ignoredNames: wsConfig.get<string[]>('ignoredNames', DEFAULT_CONFIG.ignoredNames),
    excludeGlobs: wsConfig.get<string[]>('excludeGlobs', DEFAULT_CONFIG.excludeGlobs),
    debounceMs: wsConfig.get<number>('debounceMs', DEFAULT_CONFIG.debounceMs),
    showStatusBar: wsConfig.get<boolean>(
      'showStatusBar',
      DEFAULT_CONFIG.showStatusBar
    ),
    ai: {
      enabled: wsConfig.get<boolean>('ai.enabled', DEFAULT_CONFIG.ai.enabled),
      provider: wsConfig.get<'none' | 'custom-endpoint'>(
        'ai.provider',
        DEFAULT_CONFIG.ai.provider
      ),
    },
  };
}

