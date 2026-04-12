# PDF Redactor

A free, open-source desktop app for permanently redacting sensitive content from PDFs. No cloud uploads. No subscriptions. Everything runs locally on your machine.

Unlike most PDF tools that simply draw black boxes over text (which can be copy-pasted or extracted), PDF Redactor uses **true content removal** — the underlying text, images, and metadata are permanently deleted from the file.

## Features

- **True redaction** — Content is permanently removed at the PDF level, not just visually covered
- **Search & redact** — Find text across all pages and redact every match with one click
- **Manual redaction** — Draw redaction regions directly on any page
- **Post-redaction verification** — Confirms that redacted content is no longer present in the saved file
- **Metadata cleaning** — Strips document metadata (title, author, etc.) during export
- **Undo/redo** — Full undo/redo history for all redaction operations
- **100% offline** — No network access, no data leaves your machine

## Download

Go to [Releases](https://github.com/edwarddoan/pdf-redactor/releases) and download the installer for your platform:

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `.dmg` (aarch64) |
| macOS (Intel) | `.dmg` (x86_64) |
| Windows | `.msi` |
| Linux | `.AppImage` or `.deb` |

## Usage

1. Open a PDF file (drag and drop or click "Open PDF")
2. Use **Search** to find sensitive text, or switch to the **Redact tool** to manually draw regions
3. Review your pending redactions in the sidebar
4. Click **Export** to save a permanently redacted copy

The original file is never modified. A new file is saved with your chosen name (default: `{original} (Redacted).pdf`).

## Building from Source

### Prerequisites

- [Rust](https://rustup.rs/) (1.77.2+)
- [Node.js](https://nodejs.org/) (22+)
- Platform-specific dependencies for [Tauri](https://v2.tauri.app/start/prerequisites/)

**Linux only** — install these system packages:
```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev
```

### Build

```bash
# Install frontend dependencies
npm install

# Development (opens app with hot reload)
cargo tauri dev

# Production build (creates installer)
cargo tauri build
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Tauri 2 |
| PDF engine | MuPDF (via Rust FFI) |
| Frontend | React 19, TypeScript 6 |
| State management | Zustand |
| PDF rendering | PDF.js |
| Build tool | Vite 8 |

## How Redaction Works

1. You mark regions on the PDF (manually or via text search)
2. On export, MuPDF creates `Redact` annotations at each region
3. MuPDF's `page.redact()` is called, which **permanently removes** all content under the annotation
4. The document is saved — the original content no longer exists in the file
5. Optionally, the app re-reads the saved PDF to verify no redacted text leaked through

This is the same approach used by professional redaction tools. The content is gone — not hidden, not covered, not recoverable.

## Privacy

- No network access. The app has zero network plugins or capabilities.
- No telemetry, analytics, or crash reporting.
- No cloud processing. Everything happens on your CPU.
- Your files never leave your machine.

## License

[AGPL-3.0-or-later](LICENSE)

You are free to use, modify, and distribute this software. If you distribute a modified version or run it as a service, you must make your source code available under the same license.

## Credits

A project by Edward (codedbydee111)
