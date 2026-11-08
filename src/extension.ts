import * as vscode from 'vscode';
import { DiagnosticsManager } from './diagnostics';
import { getConfig } from './config';
import {
  NamingHelperCodeActionProvider,
  applySafeRename,
  addIgnoredName,
} from './codeActions';
import { NamingHelperHoverProvider } from './hover';
import { openNamingRulesGuide } from './guide';
import { NamingStatusBarManager } from './statusBar';
import { suggestBetterNameWithAI } from './ai';

let diagnosticsManager: DiagnosticsManager | undefined;
let statusBarManager: NamingStatusBarManager | undefined;

/**
 * Activates the Naming Helper extension.
 *
 * @param context - Extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext): void {
  diagnosticsManager = new DiagnosticsManager();
  statusBarManager = new NamingStatusBarManager(diagnosticsManager);

  context.subscriptions.push({
    dispose: () => {
      diagnosticsManager?.dispose();
      statusBarManager?.dispose();
    },
  });

  // Scan currently active text editor if open
  if (vscode.window.activeTextEditor) {
    diagnosticsManager.scheduleScan(vscode.window.activeTextEditor.document, true);
    statusBarManager.update(vscode.window.activeTextEditor);
  }

  // Document opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      diagnosticsManager?.scheduleScan(document);
      if (vscode.window.activeTextEditor?.document === document) {
        statusBarManager?.update(vscode.window.activeTextEditor);
      }
    })
  );

  // Document changed (debounced)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      diagnosticsManager?.scheduleScan(event.document);
      if (vscode.window.activeTextEditor?.document === event.document) {
        statusBarManager?.update(vscode.window.activeTextEditor);
      }
    })
  );

  // Document closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnosticsManager?.handleDocumentClosed(document);
      statusBarManager?.update(vscode.window.activeTextEditor);
    })
  );

  // Active editor switched
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        diagnosticsManager?.scheduleScan(editor.document, true);
      }
      statusBarManager?.update(editor);
    })
  );

  // Configuration changed
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('namingHelper')) {
        if (vscode.window.activeTextEditor) {
          diagnosticsManager?.scheduleScan(
            vscode.window.activeTextEditor.document,
            true
          );
        }
        statusBarManager?.update(vscode.window.activeTextEditor);
      }
    })
  );

  // Command: Scan Current File
  context.subscriptions.push(
    vscode.commands.registerCommand('namingHelper.scanFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor to scan.');
        return;
      }
      diagnosticsManager?.scheduleScan(editor.document, true);
      vscode.window.showInformationMessage(
        `Naming Helper: Scanned ${editor.document.fileName}`
      );
    })
  );

  // Command: Show Report
  context.subscriptions.push(
    vscode.commands.registerCommand('namingHelper.showReport', async () => {
      await statusBarManager?.showReport(vscode.window.activeTextEditor);
    })
  );

  // Command: Suggest Better Name With AI (Milestone 6)
  context.subscriptions.push(
    vscode.commands.registerCommand('namingHelper.suggestWithAI', async () => {
      await suggestBetterNameWithAI(context);
    })
  );

  // Command: Toggle Enable/Disable
  context.subscriptions.push(
    vscode.commands.registerCommand('namingHelper.toggle', async () => {
      const config = getConfig();
      const current = config.enable;
      const wsConfig = vscode.workspace.getConfiguration('namingHelper');
      await wsConfig.update('enable', !current, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `Naming Helper has been ${!current ? 'enabled' : 'disabled'}.`
      );
    })
  );

  // Register Code Action Provider (Quick Fixes)
  const supportedLanguages = [
    'javascript',
    'typescript',
    'javascriptreact',
    'typescriptreact',
  ];
  for (const language of supportedLanguages) {
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        { language, scheme: 'file' },
        new NamingHelperCodeActionProvider(diagnosticsManager),
        {
          providedCodeActionKinds:
            NamingHelperCodeActionProvider.providedCodeActionKinds,
        }
      )
    );
  }

  // Register Hover Provider
  for (const language of supportedLanguages) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(
        { language, scheme: 'file' },
        new NamingHelperHoverProvider(diagnosticsManager)
      )
    );
  }

  // Command: Explain Naming Rules
  context.subscriptions.push(
    vscode.commands.registerCommand('namingHelper.explainRules', () => {
      openNamingRulesGuide();
    })
  );

  // Command: Apply Safe Rename
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'namingHelper.applyRename',
      async (
        uri: vscode.Uri,
        position: vscode.Position,
        oldName: string,
        newName: string
      ) => {
        await applySafeRename(uri, position, oldName, newName);
      }
    )
  );

  // Command: Ignore Name
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'namingHelper.ignoreName',
      async (name: string) => {
        await addIgnoredName(name);
        if (vscode.window.activeTextEditor) {
          diagnosticsManager?.scheduleScan(
            vscode.window.activeTextEditor.document,
            true
          );
        }
      }
    )
  );
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
  diagnosticsManager?.dispose();
  diagnosticsManager = undefined;
  statusBarManager?.dispose();
  statusBarManager = undefined;
}

