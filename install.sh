#!/usr/bin/env bash
set -euo pipefail

DEST_DIR="${HERMES_HOME:-$HOME/.hermes}/desktop-plugins/vim-nav"
mkdir -p "$DEST_DIR"

echo "Installing Hermes Desktop Vim Navigation plugin..."
curl -fsSL https://raw.githubusercontent.com/vaskoyudha/hermes-desktop-vim/main/plugin.js -o "$DEST_DIR/plugin.js"

echo "✓ Installed successfully to $DEST_DIR/plugin.js"
echo "Open or reload Hermes Desktop (Ctrl+K -> 'Reload desktop plugins') to activate!"
