import * as vscode from 'vscode';
import { DIAGNOSTIC_SOURCE, DiagnosticsManager } from './diagnostics';

/**
 * CodeActionProvider for Naming Helper quick fixes.
 */
export class NamingHelperCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  constructor(private readonly diagnosticsManager: DiagnosticsManager) {}

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const uriString = document.uri.toString();
    const violations = this.diagnosticsManager.getViolationsForUri(uriString);

    // Filter diagnostics that originated from Naming Helper
    const namingDiagnostics = context.diagnostics.filter(
      (d) => d.source === DIAGNOSTIC_SOURCE
    );

    for (const diagnostic of namingDiagnostics) {
      // Find matching violation by line & character overlap
      const violation = violations.find(
        (v) =>
          v.range.start.line === diagnostic.range.start.line &&
          Math.abs(v.range.start.character - diagnostic.range.start.character) <= 1
      );

      const variableName = violation
        ? violation.name
        : document.getText(diagnostic.range);

      // 1. Rename Quick Fix for each candidate
      if (violation && violation.candidates.length > 0) {
        violation.candidates.forEach((candidate, index) => {
          const action = new vscode.CodeAction(
            `Rename '${variableName}' to '${candidate.name}'`,
            vscode.CodeActionKind.QuickFix
          );
          action.diagnostics = [diagnostic];
          action.isPreferred = index === 0;
          action.command = {
            command: 'namingHelper.applyRename',
            title: `Rename to ${candidate.name}`,
            arguments: [
              document.uri,
              diagnostic.range.start,
              variableName,
              candidate.name,
            ],
          };
          actions.push(action);
        });
      }

      // 2. Ignore Name Quick Fix: "Don't suggest for this name"
      const ignoreAction = new vscode.CodeAction(
        `Don't suggest for '${variableName}'`,
        vscode.CodeActionKind.QuickFix
      );
      ignoreAction.diagnostics = [diagnostic];
      ignoreAction.command = {
        command: 'namingHelper.ignoreName',
        title: `Ignore '${variableName}'`,
        arguments: [variableName],
      };
      actions.push(ignoreAction);
    }

    return actions;
  }
}

/**
 * Safely applies a rename using VS Code's built-in executeDocumentRenameProvider.
 *
 * @param uri - Target document URI
 * @param position - Position of identifier
 * @param oldName - Current variable name
 * @param newName - Suggested replacement variable name
 */
export async function applySafeRename(
  uri: vscode.Uri,
  position: vscode.Position,
  oldName: string,
  newName: string
): Promise<void> {
  try {
    const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      'vscode.executeDocumentRenameProvider',
      uri,
      position,
      newName
    );

    if (!workspaceEdit || workspaceEdit.size === 0) {
      vscode.window.showInformationMessage(
        `Naming Helper: Could not rename '${oldName}'. The language rename provider returned no edits.`
      );
      return;
    }

    const success = await vscode.workspace.applyEdit(workspaceEdit);
    if (!success) {
      vscode.window.showWarningMessage(
        `Naming Helper: Failed to apply rename edit from '${oldName}' to '${newName}'.`
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Naming Helper: Error during rename: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Adds a variable name to the workspace-level ignoredNames setting.
 *
 * @param name - Variable name to ignore
 */
export async function addIgnoredName(name: string): Promise<void> {
  const wsConfig = vscode.workspace.getConfiguration('namingHelper');
  const currentIgnored = wsConfig.get<string[]>('ignoredNames', []);

  if (!currentIgnored.includes(name)) {
    const updated = [...currentIgnored, name];
    await wsConfig.update('ignoredNames', updated, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(
      `Naming Helper: Added '${name}' to ignored names list.`
    );
  } else {
    vscode.window.showInformationMessage(
      `Naming Helper: '${name}' is already in ignored names.`
    );
  }
}

