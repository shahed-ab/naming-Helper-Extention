import * as vscode from 'vscode';

/**
 * Generates the HTML content for the Naming Rules educational guide.
 */
export function getGuideHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Naming Helper: Rules & Best Practices</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      padding: 24px;
      color: var(--vscode-editor-foreground, #333);
      background-color: var(--vscode-editor-background, #fff);
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: var(--vscode-symbolIcon-colorForeground, #007acc);
      border-bottom: 2px solid var(--vscode-panel-border, #e0e0e0);
      padding-bottom: 8px;
    }
    h2 {
      margin-top: 28px;
      color: var(--vscode-foreground, #222);
    }
    code {
      background: var(--vscode-textCodeBlock-background, rgba(127,127,127,0.15));
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family, monospace);
    }
    pre {
      background: var(--vscode-textCodeBlock-background, rgba(127,127,127,0.15));
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
    }
    .card {
      border-left: 4px solid #007acc;
      background: var(--vscode-textBlockQuote-background, rgba(0, 122, 204, 0.08));
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 6px 6px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid var(--vscode-panel-border, #ddd);
      padding: 10px;
      text-align: left;
    }
    th {
      background: var(--vscode-badge-background, rgba(0,0,0,0.05));
    }
    .bad {
      color: #e51400;
      font-weight: bold;
    }
    .good {
      color: #388a34;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>💡 Naming Helper: Guide to Clean Variable Names</h1>
  <p>Good variable names act as built-in documentation. When code is well-named, you and your teammates can understand what it does without guessing or reading line by line.</p>

  <h2>1. The 5 Golden Rules</h2>
  
  <div class="card">
    <h3>1. Use Plural Nouns for Collections</h3>
    <p>Arrays and lists contain multiple items. Always use plural nouns (<code>users</code>, <code>items</code>, <code>tags</code>) rather than generic singulars (<code>arr</code>, <code>list</code>, <code>item</code>).</p>
  </div>

  <div class="card">
    <h3>2. Prefix Booleans with is, has, can, or should</h3>
    <p>Booleans represent true/false conditions. A boolean variable should read like a question: <code>isValid</code>, <code>hasPermission</code>, <code>isLoading</code>, <code>canSubmit</code>.</p>
  </div>

  <div class="card">
    <h3>3. Suffix DOM Elements Clearly</h3>
    <p>When selecting HTML elements, append <code>Element</code> or <code>Btn</code> (e.g. <code>submitButtonElement</code>, <code>cardElement</code>) to distinguish DOM nodes from raw data.</p>
  </div>

  <div class="card">
    <h3>4. Avoid Generic Vague Placeholders</h3>
    <p>Never use <code>x</code>, <code>temp</code>, <code>data</code>, <code>res</code>, <code>obj</code>, or <code>foo</code>. Name the variable after what entity it actually holds.</p>
  </div>

  <div class="card">
    <h3>5. Avoid Arbitrary Number Suffixes</h3>
    <p>Names like <code>user1</code> and <code>user2</code> hide the distinction between variables. Use their role or state instead: <code>activeUser</code> vs <code>pendingUser</code>, or group them into a <code>users</code> array.</p>
  </div>

  <h2>2. Quick Reference Table</h2>
  <table>
    <thead>
      <tr>
        <th>Context</th>
        <th>Avoid ❌</th>
        <th>Recommended ✅</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Array of elements</td>
        <td><span class="bad">item, arr, list</span></td>
        <td><span class="good">users, items, products</span></td>
      </tr>
      <tr>
        <td>Boolean condition</td>
        <td><span class="bad">flag, val, status</span></td>
        <td><span class="good">isActive, hasError, canSave</span></td>
      </tr>
      <tr>
        <td>DOM query</td>
        <td><span class="bad">x, el, div</span></td>
        <td><span class="good">submitButtonElement, cardElement</span></td>
      </tr>
      <tr>
        <td>Filtered subset</td>
        <td><span class="bad">temp, res</span></td>
        <td><span class="good">filteredUsers, activeItems</span></td>
      </tr>
      <tr>
        <td>Single item in find()</td>
        <td><span class="bad">val, res, arr</span></td>
        <td><span class="good">user, selectedProduct</span></td>
      </tr>
      <tr>
        <td>API network response</td>
        <td><span class="bad">res, data, obj</span></td>
        <td><span class="good">response, parsedResponse, payload</span></td>
      </tr>
    </tbody>
  </table>

  <h2>3. Conventional Exceptions</h2>
  <p>Single letters are allowed in specific industry-standard idioms:</p>
  <ul>
    <li><code>i</code>, <code>j</code>, <code>k</code> inside <code>for</code> loops as index counters.</li>
    <li><code>e</code> in <code>catch (e)</code> blocks and event handlers (<code>onClick(e)</code>).</li>
    <li><code>x</code>, <code>y</code>, <code>z</code> in coordinate, geometric, or math calculations (e.g. <code>Point { x, y }</code>).</li>
    <li><code>_</code> for intentionally ignored callback parameters.</li>
  </ul>
</body>
</html>`;
}

/**
 * Opens the Naming Rules educational guide in a VS Code Webview panel.
 */
export function openNamingRulesGuide(): void {
  const panel = vscode.window.createWebviewPanel(
    'namingHelperRulesGuide',
    'Naming Helper: Explain Naming Rules',
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );

  panel.webview.html = getGuideHtml();
}

