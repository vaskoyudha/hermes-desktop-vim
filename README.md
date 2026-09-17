# Hermes Desktop Vim Navigation ⚡

A lightweight, high-performance **modal Vim keyboard navigation plugin** for [Hermes Desktop](https://hermes-agent.nousresearch.com/docs) (by Nous Research).

Provides modal navigation (Normal & Insert modes), smooth momentum scrolling, tab cycling, and Command Palette navigation—all without breaking the prompt composer or native shortcuts.

---

## ✨ Features

- **Modal Editing**:
  - **NORMAL Mode**: Full keyboard navigation across chats, tabs, and panels without touching your mouse.
  - **INSERT Mode**: Free, unmodified typing inside prompt composers and text fields.
- **High-Performance Smooth Scrolling**:
  - Custom `requestAnimationFrame` velocity accumulator (60 / 120 / 144 Hz).
  - Eliminates native `behavior: 'smooth'` rubber-banding and layout thrashing.
  - Rapid key repeats smoothly accelerate without stuttering or latency.
- **Session Tab & Window Management**:
  - Cycle through tabs using `gt` / `gT` or `J` / `K`.
  - Open new tabs with `t`, close active tabs with `x`.
- **Command Palette Integration**:
  - Navigate lists and session pickers with `Ctrl+J` / `Ctrl+K` or `Ctrl+N` / `Ctrl+P`.
- **Native Status Bar Mode Badge**:
  - Clean monospace indicator in the bottom-left status bar (`◆ NORMAL` / `◇ INSERT`).
  - Interactive on-screen cheat sheet overlay (press `?` or click the badge).
- **Zero Build Step**:
  - Standalone ESM plugin loaded natively by Hermes Desktop’s runtime plugin loader.
  - Automatically persistent across Hermes Agent app updates.

---

## 🚀 Quick Install

### One-Line Install:
```bash
curl -fsSL https://raw.githubusercontent.com/vaskoyudha/hermes-desktop-vim/main/install.sh | bash
```

### Manual Install:
Create the plugin folder and download `plugin.js`:
```bash
mkdir -p ~/.hermes/desktop-plugins/vim-nav
curl -fsSL https://raw.githubusercontent.com/vaskoyudha/hermes-desktop-vim/main/plugin.js -o ~/.hermes/desktop-plugins/vim-nav/plugin.js
```

### Activate:
1. Open **Hermes Desktop**.
2. If already open, press **`Ctrl+K`** (or `Ctrl+P`) $\rightarrow$ type **"Reload desktop plugins"** (or simply restart the app).
3. Look at the bottom-left status bar for the `◆ NORMAL` badge!

---

## ⌨️ Shortcuts Reference

### Mode Switching
| Key | Mode | Action |
| :--- | :--- | :--- |
| `i` / `a` | Normal $\rightarrow$ Insert | Focus chat prompt composer at the end |
| `I` | Normal $\rightarrow$ Insert | Focus chat prompt composer at the start |
| `Esc` or `Ctrl+[` | Insert $\rightarrow$ Normal | Unfocus composer and return to Normal navigation |

### Transcript Scrolling (Normal Mode)
| Key | Action | Description |
| :--- | :--- | :--- |
| `j` / `Ctrl+j` | Scroll Down | Smooth line-by-line momentum scroll |
| `k` | Scroll Up | Smooth line-by-line momentum scroll |
| `d` / `Ctrl+d` | Half-Page Down | Smooth half-viewport jump down |
| `u` / `Ctrl+u` | Half-Page Up | Smooth half-viewport jump up |
| `gg` | Jump to Top | Instant scroll to the beginning of the conversation |
| `G` (`Shift+g`) | Jump to Bottom | Instant scroll to the latest message |

### Tabs & Panels
| Key | Action | Description |
| :--- | :--- | :--- |
| `gt` or `J` (`Shift+j`) | Next Tab | Switch to the next open session tab |
| `gT` or `K` (`Shift+k`) | Previous Tab | Switch to the previous session tab |
| `t` | New Tab | Open a new session tab |
| `x` | Close Tab | Close the active session tab |
| `b` | Toggle Sidebar | Toggle the left navigation sidebar |

### Command Palette & Navigation
| Key | Context | Action |
| :--- | :--- | :--- |
| `/` | Normal Mode | Focus prompt composer |
| `:` | Normal Mode | Open Command Palette / Quick Open |
| `Ctrl+j` / `Ctrl+n` | In Palette | Select **next** item in the list |
| `Ctrl+k` / `Ctrl+p` | In Palette | Select **previous** item in the list |
| `?` | Normal Mode | Toggle interactive on-screen Cheat Sheet HUD |

---

## 🛠️ How It Works

Hermes Desktop includes an extensible **Desktop Plugin SDK** (`@hermes/plugin-sdk`) with dynamic ESM runtime loading.

1. **`KEYBINDS_AREA` Registration**:
   Shortcuts are registered directly into Hermes Desktop’s internal `$comboIndex`. This informs the core event router that single keys (`j`, `k`, `g`, etc.) are intentional navigation commands, preventing the built-in `type-to-focus` mechanism from stealing them.
2. **Input Isolation**:
   When focus enters `<input>`, `<textarea>`, or `[contenteditable]`, the mode automatically transitions to `INSERT`, and all keypresses pass directly to the browser with zero lag or interference.
3. **RAF Momentum Engine**:
   Scrolling uses a 60/120/144Hz continuous interpolation loop (`requestAnimationFrame`), avoiding native `behavior: 'smooth'` animation queue cancellations when keys are held down.

---

## 📄 License

MIT License. Crafted for the [Hermes Agent](https://github.com/NousResearch/hermes-agent) community.
