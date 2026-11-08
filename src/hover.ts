import * as vscode from 'vscode';
import { DiagnosticsManager } from './diagnostics';

/**
 * HoverProvider that presents educational explanations and naming recommendations.
 */
export class NamingHelperHoverProvider implements vscode.HoverProvider {
  constructor(private readonly diagnosticsManager: DiagnosticsManager) {}

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.Hover | null {
    const uriString = document.uri.toString();
    const violations = this.diagnosticsManager.getViolationsForUri(uriString);

    if (violations.length === 0) {
      return null;
    }

    // Find violation intersecting current hover position
    const violation = violations.find((v) => {
      const start = new vscode.Position(v.range.start.line, v.range.start.character);
      const end = new vscode.Position(v.range.end.line, v.range.end.character);
      const range = new vscode.Range(start, end);
      return range.contains(position);
    });

    if (!violation) {
      return null;
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    md.appendMarkdown(`### 💡 Naming Helper: \`${violation.name}\`\n\n`);
    md.appendMarkdown(`**${violation.message}**\n\n`);
    md.appendMarkdown(`${violation.explanation}\n\n`);

    if (violation.candidates.length > 0) {
      md.appendMarkdown(`#### 🎯 Suggested Alternatives:\n`);
      for (const candidate of violation.candidates) {
        const pct = Math.round(candidate.confidence * 100);
        md.appendMarkdown(
          `- **\`${candidate.name}\`** (${pct}% match) — ${candidate.reason}\n`
        );
      }
      md.appendMarkdown('\n');
    }

    if (violation.namingTip) {
      md.appendMarkdown(`> 💡 **Naming Tip**: ${violation.namingTip}\n\n`);
    }

    md.appendMarkdown(
      `*Press \`Ctrl+.\` (or \`Cmd+.\`) on \`${violation.name}\` to apply a safe rename or ignore it.*`
    );

    const hoverRange = new vscode.Range(
      violation.range.start.line,
      violation.range.start.character,
      violation.range.end.line,
      violation.range.end.character
    );

    return new vscode.Hover(md, hoverRange);
  }
}

