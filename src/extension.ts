import * as vscode from 'vscode';
import { DiagnosticsManager } from './diagnostics';
import { getConfig } from './config';

let diagnosticsManager: DiagnosticsManager | undefined;

/**
 * Activates the Naming Helper extension.
 *
 * @param context - Extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext): void {
  diagnosticsManager = new DiagnosticsManager();
  context.subscriptions.push({
    dispose: () => {
      diagnosticsManager?.dispose();
    },
  });

  // Scan currently active text editor if open
  if (vscode.window.activeTextEditor) {
    diagnosticsManager.scheduleScan(vscode.window.activeTextEditor.document, true);
  }

  // Document opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      diagnosticsManager?.scheduleScan(document);
    })
  );

  // Document changed (debounced)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      diagnosticsManager?.scheduleScan(event.document);
    })
  );

  // Document closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnosticsManager?.handleDocumentClosed(document);
    })
  );

  // Active editor switched
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        diagnosticsManager?.scheduleScan(editor.document, true);
      }
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
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
  diagnosticsManager?.dispose();
  diagnosticsManager = undefined;
}

