import { atom, useValue, STATUSBAR_AREAS, KEYBINDS_AREA } from '@hermes/plugin-sdk'
import { createElement as h } from 'react'

const ID = 'vim-nav'

// Reactive state stores
const $vimMode = atom('NORMAL') // 'NORMAL' | 'INSERT'
const $pendingKey = atom('')    // chord buffer (e.g. 'g')
const $showHelp = atom(false)   // help cheat sheet modal

function isEditable(el) {
  if (!el) return false
  if (el.isContentEditable) return true
  const tag = el.tagName ? el.tagName.toLowerCase() : ''
  if (tag === 'textarea' || tag === 'select') return true
  if (tag === 'input') {
    const type = (el.type || 'text').toLowerCase()
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'image'].includes(type)
  }
  if (el.closest && el.closest('[contenteditable="true"], [data-slot="composer-rich-input"], .monaco-editor, [role="textbox"]')) {
    return true
  }
  return false
}

function isOverlayBlocking() {
  if ($showHelp.get()) return false
  const overlay = document.querySelector('[role="dialog"], [role="alertdialog"], [data-overlay-surface], [data-radix-popper-content-wrapper]')
  return overlay !== null
}

let cachedViewport = null
let lastViewportCheck = 0

function getActiveViewport() {
  const now = performance.now()
  if (cachedViewport && cachedViewport.isConnected && now - lastViewportCheck < 400) {
    return cachedViewport
  }
  lastViewportCheck = now
  const viewports = document.querySelectorAll('[data-slot="aui_thread-viewport"]')
  for (let i = 0; i < viewports.length; i++) {
    const vp = viewports[i]
    if (vp.clientHeight > 0) {
      cachedViewport = vp
      return vp
    }
  }
  cachedViewport = document.querySelector('[data-slot="aui_thread-viewport"]') || document.scrollingElement || document.documentElement
  return cachedViewport
}

// High-performance requestAnimationFrame momentum scroll accumulator (like Vimium / native Vim)
let targetDelta = 0
let rafId = null

function stepScroll() {
  if (Math.abs(targetDelta) < 0.5) {
    targetDelta = 0
    rafId = null
    return
  }
  // Smoothly interpolate towards target scroll position
  const step = targetDelta * 0.38
  targetDelta -= step
  const vp = getActiveViewport()
  if (vp) {
    vp.scrollTop += step
  }
  rafId = requestAnimationFrame(stepScroll)
}

function smoothScrollBy(delta) {
  targetDelta += delta
  if (!rafId) {
    rafId = requestAnimationFrame(stepScroll)
  }
}

function unlockStickToBottom(vp) {
  if (vp) {
    // use-stick-to-bottom requires a wheel event with deltaY < 0 to escape the bottom lock
    vp.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }))
  }
}

function scrollDown(amount = 90) {
  smoothScrollBy(amount)
}

function scrollUp(amount = 90) {
  const vp = getActiveViewport()
  unlockStickToBottom(vp)
  smoothScrollBy(-amount)
}

function scrollToTop() {
  targetDelta = 0
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  const vp = getActiveViewport()
  unlockStickToBottom(vp)
  if (vp) vp.scrollTop = 0
}

function scrollToBottom() {
  targetDelta = 0
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  const vp = getActiveViewport()
  if (vp) vp.scrollTop = vp.scrollHeight
}

function focusComposer(atStart = false) {
  const inputs = Array.from(document.querySelectorAll(
    '[data-slot="composer-rich-input"], textarea, [contenteditable="true"], .aui-composer-input'
  ))
  for (const el of inputs) {
    if (el.offsetParent !== null || el.getBoundingClientRect().height > 0) {
      el.focus()
      if (el.isContentEditable) {
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(atStart)
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(range)
        }
      } else if (typeof el.setSelectionRange === 'function') {
        const pos = atStart ? 0 : el.value.length
        el.setSelectionRange(pos, pos)
      }
      return true
    }
  }
  return false
}

function getTabs() {
  return Array.from(document.querySelectorAll('[data-slot="pane-tab"]')).filter(tab => {
    return tab.offsetParent !== null || tab.getBoundingClientRect().width > 0
  })
}

function nextTab() {
  const tabs = getTabs()
  if (tabs.length > 1) {
    const activeIdx = tabs.findIndex(t => t.getAttribute('data-active') === 'true')
    const nextIdx = (activeIdx + 1) % tabs.length
    tabs[nextIdx].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    tabs[nextIdx].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', ctrlKey: true, bubbles: true }))
}

function prevTab() {
  const tabs = getTabs()
  if (tabs.length > 1) {
    const activeIdx = tabs.findIndex(t => t.getAttribute('data-active') === 'true')
    const prevIdx = (activeIdx - 1 + tabs.length) % tabs.length
    tabs[prevIdx].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    tabs[prevIdx].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', ctrlKey: true, shiftKey: true, bubbles: true }))
}

function closeCurrentTab() {
  const tabs = getTabs()
  const activeTab = tabs.find(t => t.getAttribute('data-active') === 'true')
  if (activeTab) {
    const closeBtn = activeTab.querySelector('button[aria-label*="lose"], button[aria-label*="utup"], [data-slot="pane-tab-close"]')
    if (closeBtn) {
      closeBtn.click()
      return
    }
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', ctrlKey: true, bubbles: true }))
}

function newTab() {
  const plusBtn = document.querySelector('[data-slot="pane-tab-add"], button[aria-label*="New tab"], button[aria-label*="Add tab"]')
  if (plusBtn) {
    plusBtn.click()
    return
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', code: 'KeyT', ctrlKey: true, bubbles: true }))
}

function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: true, bubbles: true }))
}

function toggleSidebar() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', code: 'KeyB', ctrlKey: true, bubbles: true }))
}

// Subcomponents for Help Cheat Sheet
function ShortCutRow({ keys, desc }) {
  return h('div', { className: 'vim-row' },
    h('div', { className: 'vim-row-keys' },
      keys.map((k, i) => h('kbd', { key: i, className: 'vim-kbd' }, k))
    ),
    h('div', { className: 'vim-row-desc' }, desc)
  )
}

function VimHelpModal() {
  const show = useValue($showHelp)
  if (!show) return null

  return h('div', {
    className: 'vim-help-overlay',
    onClick: (e) => {
      if (e.target === e.currentTarget) $showHelp.set(false)
    }
  },
    h('div', { className: 'vim-help-modal' },
      h('div', { className: 'vim-help-header' },
        h('div', { className: 'vim-help-title' },
          h('span', { className: 'vim-title-icon' }, '⌨'),
          'Vim Navigation Shortcuts'
        ),
        h('button', {
          className: 'vim-help-close',
          onClick: () => $showHelp.set(false),
          'aria-label': 'Close'
        }, '✕')
      ),
      h('div', { className: 'vim-help-body' },
        h('div', { className: 'vim-section' },
          h('div', { className: 'vim-section-title' }, 'Mode Switching'),
          h(ShortCutRow, { keys: ['i', 'a'], desc: 'Enter INSERT mode (focus composer)' }),
          h(ShortCutRow, { keys: ['Esc', 'Ctrl+['], desc: 'Exit INSERT mode (NORMAL navigation)' })
        ),
        h('div', { className: 'vim-section' },
          h('div', { className: 'vim-section-title' }, 'Scrolling (Normal Mode)'),
          h(ShortCutRow, { keys: ['j', 'k'], desc: 'Scroll chat down / up' }),
          h(ShortCutRow, { keys: ['d', 'u'], desc: 'Scroll half-page down / up (Ctrl+d/u)' }),
          h(ShortCutRow, { keys: ['gg'], desc: 'Scroll to top of chat' }),
          h(ShortCutRow, { keys: ['G'], desc: 'Scroll to bottom of chat' })
        ),
        h('div', { className: 'vim-section' },
          h('div', { className: 'vim-section-title' }, 'Tabs & Windows'),
          h(ShortCutRow, { keys: ['gt', 'J'], desc: 'Next session tab' }),
          h(ShortCutRow, { keys: ['gT', 'K'], desc: 'Previous session tab' }),
          h(ShortCutRow, { keys: ['t'], desc: 'New session tab' }),
          h(ShortCutRow, { keys: ['x'], desc: 'Close active tab' })
        ),
        h('div', { className: 'vim-section' },
          h('div', { className: 'vim-section-title' }, 'Navigation & Panels'),
          h(ShortCutRow, { keys: ['/'], desc: 'Focus composer input' }),
          h(ShortCutRow, { keys: [':'], desc: 'Open Command Palette' }),
          h(ShortCutRow, { keys: ['Ctrl+j', 'Ctrl+k'], desc: 'Palette: Select next / previous' }),
          h(ShortCutRow, { keys: ['b'], desc: 'Toggle Left Sidebar' }),
          h(ShortCutRow, { keys: ['?'], desc: 'Toggle this cheat sheet' })
        )
      ),
      h('div', { className: 'vim-help-footer' },
        'Press ',
        h('kbd', { className: 'vim-kbd' }, 'Esc'),
        ' to close this modal and return to Normal mode.'
      )
    )
  )
}

function VimStatusBar() {
  const mode = useValue($vimMode)
  const pending = useValue($pendingKey)
  const isNormal = mode === 'NORMAL'

  const label = isNormal
    ? (pending ? `NORMAL (${pending}…)` : 'NORMAL')
    : 'INSERT'

  return h('div', { className: 'vim-status-center-wrap' },
    h('div', {
      className: 'vim-status-badge',
      'data-mode': mode,
      title: 'Vim Navigation Mode (Click or press ? for cheat sheet)',
      onClick: () => $showHelp.set(!$showHelp.get())
    },
      h('span', { className: 'vim-mode-glyph' }, isNormal ? '◆' : '◇'),
      h('span', { className: 'vim-mode-text' }, label)
    ),
    h(VimHelpModal, null)
  )
}

const CSS = `
.vim-status-center-wrap {
  position: fixed;
  bottom: 1px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 45;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}
.vim-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 1px 9px;
  height: 18px;
  box-sizing: border-box;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition: all 0.15s ease;
}
.vim-status-badge[data-mode="NORMAL"] {
  background: color-mix(in srgb, var(--ui-accent, #3b82f6) 22%, var(--card, #181825));
  color: var(--ui-accent, #38bdf8);
  border: 1px solid color-mix(in srgb, var(--ui-accent, #3b82f6) 45%, transparent);
}
.vim-status-badge[data-mode="INSERT"] {
  background: color-mix(in srgb, #22c55e 22%, var(--card, #181825));
  color: #22c55e;
  border: 1px solid color-mix(in srgb, #22c55e 45%, transparent);
}
.vim-mode-glyph {
  font-size: 9px;
  opacity: 0.9;
}
.vim-help-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: vimFadeIn 0.12s ease-out;
}
@keyframes vimFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.vim-help-modal {
  background: var(--ui-surface-background, var(--card, #181825));
  border: 1px solid var(--ui-stroke-secondary, var(--border, #313244));
  color: var(--foreground, #cdd6f4);
  border-radius: 12px;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.vim-help-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--ui-stroke-tertiary, var(--border, #313244));
  font-weight: 600;
  font-size: 14px;
}
.vim-help-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vim-title-icon {
  font-size: 16px;
}
.vim-help-close {
  background: transparent;
  border: none;
  color: var(--ui-text-tertiary, #a6adc8);
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vim-help-close:hover {
  color: var(--foreground, #fff);
  background: rgba(255, 255, 255, 0.08);
}
.vim-help-body {
  padding: 16px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.vim-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 700;
  color: var(--ui-accent, #89b4fa);
  margin-bottom: 6px;
}
.vim-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}
.vim-row-keys {
  display: flex;
  gap: 6px;
}
.vim-kbd {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--ui-stroke-secondary, #45475a) 40%, transparent);
  border: 1px solid var(--ui-stroke-secondary, #45475a);
  color: var(--foreground, #cdd6f4);
}
.vim-row-desc {
  color: var(--ui-text-secondary, #bac2de);
  font-size: 12px;
}
.vim-help-footer {
  padding: 10px 18px;
  border-top: 1px solid var(--ui-stroke-tertiary, var(--border, #313244));
  font-size: 11px;
  color: var(--ui-text-tertiary, #a6adc8);
  background: rgba(0, 0, 0, 0.15);
  text-align: center;
}
`

export default {
  id: ID,
  name: 'Vim Navigation',
  description: 'Modal Vim keyboard navigation for Hermes Desktop (Normal & Insert modes, j/k scrolling, tab switching, and composer focus)',
  defaultEnabled: true,
  register(ctx) {
    // Inject custom styling
    const style = document.createElement('style')
    style.id = 'hermes-vim-nav-styles'
    style.textContent = CSS
    document.head.append(style)
    ctx.onDispose(() => style.remove())

    // Register Status Bar item on left
    ctx.register({
      id: 'vim-status',
      area: STATUSBAR_AREAS.left,
      order: -10,
      render: () => h(VimStatusBar, null)
    })

    // Register official keybindings in Hermes Desktop KEYBINDS_AREA
    // This hooks into Hermes's internal keybind registry so type-to-focus won't steal bare letters
    const contributedShortcuts = [
      { id: 'vim.scrollDown', label: 'Vim: Scroll Down', defaults: ['j'], run: () => scrollDown(90) },
      { id: 'vim.scrollUp', label: 'Vim: Scroll Up', defaults: ['k'], run: () => scrollUp(90) },
      { id: 'vim.scrollHalfDown', label: 'Vim: Half-Page Down', defaults: ['d'], run: () => scrollDown(window.innerHeight * 0.45) },
      { id: 'vim.scrollHalfUp', label: 'Vim: Half-Page Up', defaults: ['u'], run: () => scrollUp(window.innerHeight * 0.45) },
      { id: 'vim.leaderG', label: 'Vim: Leader (g)', defaults: ['g'], run: () => setPending('g') },
      { id: 'vim.toggleSidebar', label: 'Vim: Toggle Left Sidebar', defaults: ['b'], run: () => toggleSidebar() },
      { id: 'vim.openPalette', label: 'Vim: Open Command Palette', defaults: [':'], run: () => openCommandPalette() },
      { id: 'vim.scrollToBottom', label: 'Vim: Scroll to Bottom', defaults: ['shift+g'], run: () => scrollToBottom() },
      { id: 'vim.insert', label: 'Vim: Enter Insert Mode', defaults: ['i'], run: () => { focusComposer(false); $vimMode.set('INSERT'); } },
      { id: 'vim.append', label: 'Vim: Append (Insert Mode)', defaults: ['a'], run: () => { focusComposer(false); $vimMode.set('INSERT'); } },
      { id: 'vim.insertStart', label: 'Vim: Insert at Start', defaults: ['shift+i'], run: () => { focusComposer(true); $vimMode.set('INSERT'); } },
      { id: 'vim.nextTab', label: 'Vim: Next Session Tab', defaults: ['shift+j'], run: () => nextTab() },
      { id: 'vim.prevTab', label: 'Vim: Previous Session Tab', defaults: ['shift+k'], run: () => prevTab() },
      { id: 'vim.closeTab', label: 'Vim: Close Active Tab', defaults: ['x'], run: () => closeCurrentTab() },
      { id: 'vim.newTab', label: 'Vim: New Session Tab', defaults: ['t'], run: () => newTab() },
      { id: 'vim.cheatSheet', label: 'Vim: Toggle Cheat Sheet', defaults: ['?'], run: () => $showHelp.set(!$showHelp.get()) }
    ]

    for (const kb of contributedShortcuts) {
      ctx.register({
        id: kb.id,
        area: KEYBINDS_AREA,
        data: {
          id: kb.id,
          category: 'navigation',
          defaults: kb.defaults,
          label: kb.label,
          run: kb.run
        }
      })
    }

    let pendingTimer = null
    const clearPending = () => {
      if (pendingTimer) clearTimeout(pendingTimer)
      pendingTimer = null
      $pendingKey.set('')
    }

    const setPending = (key) => {
      if (pendingTimer) clearTimeout(pendingTimer)
      $pendingKey.set(key)
      pendingTimer = setTimeout(clearPending, 1200)
    }

    // Window focus tracker to update mode automatically
    const onFocusIn = (e) => {
      if (isEditable(e.target)) {
        clearPending()
        $vimMode.set('INSERT')
      }
    }

    const onFocusOut = () => {
      setTimeout(() => {
        if (!isEditable(document.activeElement)) {
          $vimMode.set('NORMAL')
        }
      }, 50)
    }

    // Clicking anywhere on the chat transcript, background, or window (outside editable inputs)
    // cleanly removes focus from the composer and returns to NORMAL mode
    const onWindowPointerDown = (e) => {
      if (!isEditable(e.target) && isEditable(document.activeElement)) {
        document.activeElement.blur()
        $vimMode.set('NORMAL')
      }
    }

    window.addEventListener('pointerdown', onWindowPointerDown, { capture: true })
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', onFocusOut)
    ctx.onDispose(() => {
      window.removeEventListener('pointerdown', onWindowPointerDown, { capture: true })
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('focusout', onFocusOut)
    })

    // Capture-phase keydown handler to manage sequence chords ('gg', 'gt', 'gT'), Esc, and palette selection
    const onKeyDown = (e) => {
      const mode = $vimMode.get()
      const target = e.target

      // ─── COMMAND PALETTE & DROPDOWN NAVIGATION (Ctrl+J / Ctrl+K) ──────────
      const cmdkInput = document.querySelector('[data-slot="command-input"]')
      const isCmdkActive = Boolean(
        cmdkInput && (
          document.activeElement === cmdkInput ||
          cmdkInput.contains(document.activeElement) ||
          document.activeElement?.closest('[data-slot="command"], [cmdk-root]')
        )
      )

      if (isCmdkActive && (e.ctrlKey || e.metaKey)) {
        const key = e.key.toLowerCase()
        if (key === 'j' || key === 'n') {
          e.preventDefault()
          e.stopImmediatePropagation()
          cmdkInput.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
            cancelable: true
          }))
          return
        }

        if (key === 'k' || key === 'p') {
          e.preventDefault()
          e.stopImmediatePropagation()
          cmdkInput.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowUp',
            code: 'ArrowUp',
            keyCode: 38,
            which: 38,
            bubbles: true,
            cancelable: true
          }))
          return
        }
      }

      // ─── INSERT MODE ──────────────────────────────────────────────────────────
      if (mode === 'INSERT' || isEditable(target)) {
        if (e.key === 'Escape' || (e.ctrlKey && e.key === '[')) {
          e.preventDefault()
          e.stopImmediatePropagation()
          if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur()
          }
          clearPending()
          $vimMode.set('NORMAL')
          return
        }
        // In insert mode, all other keys type normally
        return
      }

      // ─── NORMAL MODE ──────────────────────────────────────────────────────────
      // Dismiss help modal on Escape
      if ($showHelp.get()) {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopImmediatePropagation()
          $showHelp.set(false)
        }
        return
      }

      // If a native dialog or menu overlay is open, allow default key handling
      if (isOverlayBlocking()) {
        return
      }

      // Scrolling shortcuts in Normal mode:
      // Half-page scrolling: Ctrl+d / Ctrl+u
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        e.stopImmediatePropagation()
        scrollDown(window.innerHeight * 0.45)
        return
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        e.stopImmediatePropagation()
        scrollUp(window.innerHeight * 0.45)
        return
      }

      // If user scrolls using Ctrl+j in Normal mode, smoothly scroll down (prevents toggling right sidebar tab)
      if (e.ctrlKey && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        e.stopImmediatePropagation()
        scrollDown(90)
        return
      }

      // Handle Vim multi-key chord sequences (like 'g')
      const pending = $pendingKey.get()

      if (pending === 'g') {
        clearPending()
        if (e.key === 'g') {
          e.preventDefault()
          e.stopImmediatePropagation()
          scrollToTop()
          return
        }
        if (e.key === 't') {
          e.preventDefault()
          e.stopImmediatePropagation()
          nextTab()
          return
        }
        if (e.key === 'T') {
          e.preventDefault()
          e.stopImmediatePropagation()
          prevTab()
          return
        }
      }

      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        e.stopImmediatePropagation()
        setPending('g')
        return
      }

      // Single-character shortcuts that need special sequence handling
      if (e.key === 'Escape') {
        clearPending()
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    ctx.onDispose(() => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      clearPending()
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    })
  }
}
