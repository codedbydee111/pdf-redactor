#!/bin/bash
# Dev build (debug, much faster) + launch
cd "$(dirname "$0")/.."
osascript -e 'tell application "PDF Redactor" to quit' 2>/dev/null
cargo tauri build --debug 2>&1 | tail -12
sleep 0.5
open "/tmp/pdf-redactor-target/debug/bundle/macos/PDF Redactor.app"
echo "PDF Redactor running (debug)"
