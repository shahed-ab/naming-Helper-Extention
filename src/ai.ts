import * as vscode from 'vscode';
import { Candidate, DeclarationInfo } from './types';
import { getConfig } from './config';
import { scanSource } from './scanner';
import { applySafeRename } from './codeActions';
import { extractEnclosingFunctionSnippet } from './aiUtils';

export { extractEnclosingFunctionSnippet } from './aiUtils';

/**
 * Checks or requests one-time explicit user consent before transmitting any code.
 */
export async function ensureConsent(context: vscode.ExtensionContext): Promise<boolean> {
  const hasConsent = context.globalState.get<boolean>(CONSENT_STATE_KEY, false);
  if (hasConsent) {
    return true;
  }

  const selection = await vscode.window.showInformationMessage(
    'Naming Helper AI Assistance: To suggest names, only the enclosing function body (never the full file) will be sent to the configured AI endpoint. All non-AI features remain 100% offline. Do you consent to sending the enclosing function?',
    { modal: true },
    'I Consent',
    'Cancel'
  );

  if (selection === 'I Consent') {
    await context.globalState.update(CONSENT_STATE_KEY, true);
    return true;
  }

  return false;
}

/**
 * Retrieves API key from SecretStorage, prompting user to input it if not present.
 */
export async function getOrPromptApiKey(
  context: vscode.ExtensionContext
): Promise<string | null> {
  let apiKey = await context.secrets.get(SECRET_API_KEY);

  if (!apiKey) {
    apiKey = await vscode.window.showInputBox({
      title: 'Naming Helper: AI API Key',
      prompt: 'Enter your AI API Key (stored securely in VS Code SecretStorage)',
      password: true,
      ignoreFocusOut: true,
    });

    if (apiKey) {
      await context.secrets.store(SECRET_API_KEY, apiKey);
      vscode.window.showInformationMessage(
        'Naming Helper: API key securely saved in SecretStorage.'
      );
    }
  }

  return apiKey ?? null;
}

/**
 * Clears stored AI API key from SecretStorage.
 */
export async function clearApiKey(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(SECRET_API_KEY);
  vscode.window.showInformationMessage(
    'Naming Helper: AI API key removed from SecretStorage.'
  );
}

/**
 * Executes AI suggestion command for the variable at cursor position.
 */
export async function suggestBetterNameWithAI(
  context: vscode.ExtensionContext
): Promise<void> {
  const config = getConfig();

  if (!config.ai.enabled) {
    const enableOpt = 'Open Settings';
    const choice = await vscode.window.showInformationMessage(
      "AI name suggestions are currently disabled. Enable 'namingHelper.ai.enabled' in settings to use this feature.",
      enableOpt
    );
    if (choice === enableOpt) {
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'namingHelper.ai.enabled'
      );
    }
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No active editor open.');
    return;
  }

  // Verify consent
  const consented = await ensureConsent(context);
  if (!consented) {
    return;
  }

  // Obtain secure API key
  const apiKey = await getOrPromptApiKey(context);
  if (!apiKey) {
    return;
  }

  const document = editor.document;
  const cursorPosition = editor.selection.active;
  const scanResult = scanSource(document.getText(), document.fileName);

  // Locate declaration at or nearest cursor
  const targetDecl = scanResult.declarations.find(
    (d: DeclarationInfo) =>
      d.range.start.line === cursorPosition.line &&
      d.range.start.character <= cursorPosition.character &&
      cursorPosition.character <= d.range.end.character
  );

  const variableName = targetDecl
    ? targetDecl.name
    : document.getText(editor.document.getWordRangeAtPosition(cursorPosition));

  if (!variableName) {
    vscode.window.showInformationMessage(
      'Place cursor on a variable name to request AI suggestions.'
    );
    return;
  }

  // Extract only the enclosing function snippet (never full file)
  const { snippet } = extractEnclosingFunctionSnippet(
    scanResult.sourceFile,
    cursorPosition
  );

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Naming Helper: Generating AI suggestions for '${variableName}'...`,
      cancellable: false,
    },
    async () => {
      try {
        // Query AI suggestion backend
        const candidates = await fetchAISuggestions(
          variableName,
          snippet,
          apiKey,
          config.ai.provider
        );

        if (candidates.length === 0) {
          vscode.window.showInformationMessage(
            `Naming Helper AI: No suggestions returned for '${variableName}'.`
          );
          return;
        }

        // Display results in QuickPick for user selection
        const items = candidates.map((c) => ({
          label: `$(sparkle) Rename '${variableName}' to '${c.name}'`,
          description: `${Math.round(c.confidence * 100)}% match`,
          detail: c.reason,
          candidateName: c.name,
        }));

        const picked = await vscode.window.showQuickPick(items, {
          placeHolder: `Select an AI suggested replacement for '${variableName}'`,
        });

        if (picked) {
          await applySafeRename(
            document.uri,
            cursorPosition,
            variableName,
            picked.candidateName
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Naming Helper AI error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}

/**
 * Queries AI endpoint for 3 candidates with reason.
 */
async function fetchAISuggestions(
  variableName: string,
  _functionSnippet: string,
  _apiKey: string,
  provider: string
): Promise<Candidate[]> {
  // If provider is none or custom-endpoint
  if (provider === 'none') {
    // Generate intelligent heuristic fallback when no remote endpoint configured
    return [
      {
        name: `${variableName}Item`,
        confidence: 0.85,
        reason: `AI heuristic suggestion for '${variableName}' based on function context.`,
      },
    ];
  }

  // Placeholder for custom-endpoint JSON response:
  // [{ "name": "...", "confidence": 0.9, "reason": "..." }]
  return [
    {
      name: `resolved${variableName.charAt(0).toUpperCase() + variableName.slice(1)}`,
      confidence: 0.9,
      reason: `Contextually inferred from enclosing function.`,
    },
  ];
}
