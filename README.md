# Naming Helper

> **Helps beginner developers write better variable names by detecting weak names and suggesting clearer, context-aware alternatives.**

Naming Helper scans your JavaScript and TypeScript files in real-time, detects weak placeholder names (like `x`, `temp`, `data2`, `res`), infers what the variable actually represents from its initializer and usage, suggests clearer names, and explains **WHY** in beginner-friendly language.

It works **100% offline** using AST analysis rules. Optional AI assistance is opt-in and privacy-preserving.

---

## ✨ Features

- 🔍 **Weak Name Detection**: Flags generic placeholders (`x`, `temp`, `data`, `res`, `foo`, `obj`), single-letter names outside loop/math contexts, trailing numeric suffixes (`list1`, `user2`), and type contradictions.
- 🧠 **Contextual Inference Engine**:
  - **From Initializers**:
    - `[]` $\rightarrow$ `items`, `elements`
    - `{}` $\rightarrow$ `options`, `config`
    - `await fetch(...)` $\rightarrow$ `response`, `apiResponse`
    - `await res.json()` $\rightarrow$ `parsedResponse`, `responseData`
    - `new Date()` $\rightarrow$ `currentDate`, `date`, `timestamp`
    - `document.getElementById('submit')` $\rightarrow$ `submitElement`
    - `document.querySelector('.card')` $\rightarrow$ `cardElement`
    - `users.filter(...)` $\rightarrow$ `filteredUsers`
    - `users.map(u => u.name)` $\rightarrow$ `userNames`
    - `users.find(...)` $\rightarrow$ `user`
    - `count > 10` $\rightarrow$ `isValid`, `isMatch`
    - `0` $\rightarrow$ `count`, `total`
    - `new Map()` / `new Set()` $\rightarrow$ `lookupMap`, `uniqueValues`
  - **From Usage**:
    - `.length`, `.push` used on variable $\rightarrow$ suggests plural noun (`items`)
    - Used in `if (condition)` $\rightarrow$ suggests boolean prefix (`isValid`, `isEnabled`)
    - `users.map(x => x.name)` $\rightarrow$ suggests singular noun (`user`)
    - `sendEmail(x)` $\rightarrow$ infers descriptive parameter name (`address`)
    - TypeScript types (`User[]` $\rightarrow$ `users`, `Customer` $\rightarrow$ `customer`)
- 🛡️ **Safe Renaming**: Applies renames via VS Code's official language service rename pipeline (`executeDocumentRenameProvider`). Never risky find-and-replace!
- ⚡ **Scope Collision Prevention**: Checks ancestor scope trees to guarantee suggested names do not shadow or collide with existing variables.
- 🎓 **Educational Hover Tooltips**: Explains *why* the name was flagged, lists top candidates with match percentages, and gives beginner-friendly naming tips.
- 📊 **Live Naming Score**: Shows your file's naming health in the status bar (`Naming: 87%`). Click to open an interactive QuickPick report jumping directly to flagged declarations.
- 📖 **Interactive Naming Rules Guide**: Built-in visual guide covering the 5 Golden Rules of naming.
- 🤖 **Opt-in Privacy-First AI**: Optional AI command that transmits **only** the enclosing function body (never the entire file), secured with VS Code `SecretStorage`.

---

## 📸 Demo & Quick Start

<!-- [GIF PLACEHOLDER: Quick Fix Rename Demonstration] -->
*1. Place cursor on any flagged variable with three dots below it.*  
*2. Press `Ctrl+.` (or `Cmd+.` on macOS) to open Quick Fixes.*  
*3. Select `Rename 'x' to 'submitButtonElement'` to safely rename across your code!*

---

## ⚙️ Extension Settings

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `namingHelper.enable` | `boolean` | `true` | Enable or disable Naming Helper diagnostics. |
| `namingHelper.severity` | `string` | `"Hint"` | Diagnostic severity: `"Hint"`, `"Information"`, or `"Warning"`. |
| `namingHelper.confidenceThreshold` | `number` | `0.6` | Minimum confidence score (0.0 - 1.0) required to show suggestions. |
| `namingHelper.blocklist` | `string[]` | `["x", "temp", "tmp", "data", "data2", "foo", "bar", ...]` | Identifier names considered weak placeholders. |
| `namingHelper.allowedSingleLetters` | `string[]` | `["i", "j", "k", "e", "_"]` | Single-letter names allowed in conventional contexts. |
| `namingHelper.ignoredNames` | `string[]` | `[]` | Names ignored across the workspace. |
| `namingHelper.excludeGlobs` | `string[]` | `["**/node_modules/**", "**/dist/**", ...]` | Glob patterns excluded from scanning. |
| `namingHelper.debounceMs` | `number` | `500` | Delay in milliseconds before re-scanning modified documents. |
| `namingHelper.showStatusBar` | `boolean` | `true` | Show the live Naming Score in the status bar. |
| `namingHelper.ai.enabled` | `boolean` | `false` | Enable optional AI name suggestions. |
| `namingHelper.ai.provider` | `string` | `"none"` | AI provider backend (`"none"`, `"custom-endpoint"`). |

---

## ⌨️ Contributed Commands

- `namingHelper.scanFile` — **Naming Helper: Scan Current File**
- `namingHelper.showReport` — **Naming Helper: Show Report** (jumps to weak names)
- `namingHelper.explainRules` — **Naming Helper: Explain Naming Rules** (opens visual webview guide)
- `namingHelper.toggle` — **Naming Helper: Enable/Disable**
- `namingHelper.suggestWithAI` — **Naming Helper: Suggest Better Name With AI** (Milestone 6)

---

## 🔒 Privacy & Offline Guarantee

Naming Helper operates **100% offline by default**. AST parsing, scope traversal, and rule inference happen entirely on your machine. No telemetry or analytics are collected.

When AI features are optionally enabled (`namingHelper.ai.enabled: true`):
- Transmits **only** the enclosing function body (never the full file or surrounding code).
- Sensitive credentials are held in encrypted VS Code `SecretStorage`.
- Explicit one-time consent is required before any network request is initiated.

---

## 📄 License

MIT

