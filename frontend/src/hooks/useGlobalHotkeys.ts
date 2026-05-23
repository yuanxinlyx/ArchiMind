import { useEffect } from 'react'

export interface HotkeyHandlers {
  /** Triggered by Ctrl/Cmd+Enter. Fires even inside text inputs. */
  onStart?: () => void
  /** Triggered by Space when not typing. Toggles between pause / resume. */
  onTogglePause?: () => void
  /** Triggered by Escape. Used to stop the discussion. */
  onStop?: () => void
  /** Triggered by Ctrl/Cmd+K. Opens API/Provider settings. */
  onOpenSettings?: () => void
  /** Triggered by Ctrl/Cmd+H. Opens history panel. */
  onOpenHistory?: () => void
  /** When true, Space / Escape are ignored. */
  disableTransport?: boolean
}

/** True when the user is actively typing in a text-bearing element. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

/**
 * Registers global keyboard shortcuts for the app.
 * Pass undefined for handlers that aren't applicable in the current state
 * to skip them (e.g. don't pass onStop when status === 'idle').
 */
export function useGlobalHotkeys(handlers: HotkeyHandlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+Enter: start (works even from inside the topic textarea)
      if (ctrl && e.key === 'Enter') {
        if (handlers.onStart) {
          e.preventDefault()
          handlers.onStart()
        }
        return
      }

      // Ctrl+K: open settings
      if (ctrl && (e.key === 'k' || e.key === 'K')) {
        if (handlers.onOpenSettings) {
          e.preventDefault()
          handlers.onOpenSettings()
        }
        return
      }

      // Ctrl+H: open history
      if (ctrl && (e.key === 'h' || e.key === 'H')) {
        if (handlers.onOpenHistory) {
          e.preventDefault()
          handlers.onOpenHistory()
        }
        return
      }

      // The remaining shortcuts MUST NOT fire while typing
      if (isTypingTarget(e.target)) return
      if (handlers.disableTransport) return

      // Space: toggle pause
      if (e.key === ' ' || e.code === 'Space') {
        if (handlers.onTogglePause) {
          e.preventDefault()
          handlers.onTogglePause()
        }
        return
      }

      // Escape: stop
      if (e.key === 'Escape') {
        if (handlers.onStop) {
          e.preventDefault()
          handlers.onStop()
        }
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    handlers.onStart,
    handlers.onTogglePause,
    handlers.onStop,
    handlers.onOpenSettings,
    handlers.onOpenHistory,
    handlers.disableTransport,
  ])
}
