import * as vscode from 'vscode';
import { DiagnosticsManager } from './diagnostics';
import { getConfig } from './config';
import { scanSource } from './scanner';

/**
 * Manages the Naming Score status bar item and QuickPick report.
 */
export class NamingStatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor(private readonly diagnosticsManager: DiagnosticsManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'namingHelper.showReport';
  }

  /**
   * Updates the status bar item text and score based on the current editor.
   */
  public update(editor: vscode.TextEditor | undefined): void {
    const config = getConfig();

    if (!config.showStatusBar || !editor) {
      this.statusBarItem.hide();
      return;
    }

    const doc = editor.document;
    const supportedLanguages = [
      'javascript',
      'typescript',
      'javascriptreact',
      'typescriptreact',
    ];

    if (!supportedLanguages.includes(doc.languageId)) {
      this.statusBarItem.hide();
      return;
    }

    try {
      const scanResult = scanSource(doc.getText(), doc.fileName);
      const totalDeclarations = scanResult.declarations.length;
      const violations = this.diagnosticsManager.getViolationsForUri(
        doc.uri.toString()
      );
      const flaggedCount = violations.length;

      if (totalDeclarations === 0) {
        this.statusBarItem.text = `$(check) Naming: 100%`;
        this.statusBarItem.tooltip = `Naming Helper: No variable declarations in this file.`;
      } else {
        const wellNamedCount = Math.max(0, totalDeclarations - flaggedCount);
        const score = Math.round((wellNamedCount / totalDeclarations) * 100);

        let icon = '$(check)';
        if (score < 70) {
          icon = '$(error)';
        } else if (score < 90) {
          icon = '$(warning)';
        }

        this.statusBarItem.text = `${icon} Naming: ${score}%`;
        this.statusBarItem.tooltip = `Naming Helper: ${wellNamedCount}/${totalDeclarations} declarations well-named (${score}%). Click to view report.`;
      }

      this.statusBarItem.show();
    } catch {
      this.statusBarItem.hide();
    }
  }

  /**
   * Shows an interactive QuickPick report listing all flagged names in the active file.
   */
  public async showReport(editor: vscode.TextEditor | undefined): Promise<void> {
    if (!editor) {
      vscode.window.showInformationMessage('No active editor to display naming report.');
      return;
    }

    const doc = editor.document;
    const violations = this.diagnosticsManager.getViolationsForUri(
      doc.uri.toString()
    );

    if (violations.length === 0) {
      vscode.window.showInformationMessage(
        'Naming Helper: 100% Naming Score! No weak names detected in this file.'
      );
      return;
    }

    interface ReportQuickPickItem extends vscode.QuickPickItem {
      range: vscode.Range;
    }

    const items: ReportQuickPickItem[] = violations.map((v) => {
      const startPos = new vscode.Position(v.range.start.line, v.range.start.character);
      const endPos = new vscode.Position(v.range.end.line, v.range.end.character);
      const suggestions = v.candidates.map((c) => c.name).join(', ');

      return {
        label: `$(symbol-variable) ${v.name}`,
        description: `Line ${v.range.start.line + 1}, Col ${v.range.start.character + 1} • Rule: ${v.ruleId}`,
        detail: suggestions ? `Top suggestions: ${suggestions}` : v.message,
        range: new vscode.Range(startPos, endPos),
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select a flagged name to jump to its declaration (${violations.length} weak names found)`,
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      editor.selection = new vscode.Selection(selected.range.start, selected.range.end);
      editor.revealRange(selected.range, vscode.TextEditorRevealType.InCenter);
    }
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}

