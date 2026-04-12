#!/bin/bash
# Full release build + install to /Applications for Spotlight indexing
cd "$(dirname "$0")/.."
osascript -e 'tell application "PDF Redactor" to quit' 2>/dev/null
cargo tauri build 2>&1 | tail -12

# Copy to /Applications so Spotlight can find it
cp -R "/tmp/pdf-redactor-target/release/bundle/macos/PDF Redactor.app" "/Applications/PDF Redactor.app"
echo "Installed to /Applications/PDF Redactor.app"

sleep 0.5
open "/Applications/PDF Redactor.app"
echo "PDF Redactor running (release)"
