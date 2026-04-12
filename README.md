# PDF Redactor

I had a deadline. I needed to redact a PDF. Simple, right?

So I Googled "redact PDF" and got hit with the usual circus — upload your file to some random website, sign up for a free trial that's not actually free, get reminded 47 times that "Pro" unlocks the feature you actually need, and oh by the way here's an ad. All I wanted to do was black out some text and save the file. That's it. That's the whole task.

Every tool was either a subscription trying to empty my wallet, a sketchy online editor uploading my sensitive documents to god-knows-where, or something that just drew a black rectangle on top of the text (which anyone can copy-paste right through). I got sick of it.

So I built this instead.

**PDF Redactor** is a free, open-source desktop app that does one thing properly: permanently redact sensitive content from PDFs. No cloud uploads. No subscriptions. No ads. No "upgrade to Pro." Everything runs locally on your machine, and when it says the content is redacted, it means the content is **gone** — not hidden under a black box, but actually deleted from the file.

## Features

- **True redaction** — Content is permanently removed at the PDF level, not just visually covered
- **Search & redact** — Find text across all pages and redact every match with one click
- **Manual redaction** — Draw redaction regions directly on any page
- **Post-redaction verification** — Confirms that redacted content is no longer present in the saved file
- **Metadata cleaning** — Strips document metadata (title, author, etc.) during export
- **Undo/redo** — Full undo/redo history for all redaction operations
- **100% offline** — No network access, no data leaves your machine

## Download

Go to [Releases](https://github.com/codedbydee111/pdf-redactor/releases) and download the installer for your platform:

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
