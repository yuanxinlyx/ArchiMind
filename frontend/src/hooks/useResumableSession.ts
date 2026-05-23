/**
 * Persists an in-progress discussion session to localStorage so the user
 * can recover after a crash, accidental tab close, or network drop.
 *
 * Storage strategy:
 *   - Single slot (only one concurrent session is supported)
 *   - Auto-expires after 24 hours
 *   - Writes are throttled to at most one per THROTTLE_MS so streaming
 *     token updates (which fire dozens of times per second) don't block
 *     the main thread on JSON.stringify + localStorage.setItem
 */
import { useEffect, useRef, useState } from 'react'
import type { ResumableSession } from '../types'

const STORAGE_KEY = 'archimind-resumable-session'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24h
const THROTTLE_MS = 1500

let lastWriteAt = 0
let pendingTimer: ReturnType<typeof setTimeout> | null = null
let pendingPayload: ResumableSession | null = null

function flushPending(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
  if (pendingPayload === null) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingPayload))
    lastWriteAt = Date.now()
  } catch {
    // Quota exceeded or storage disabled — silently drop
  }
  pendingPayload = null
}

export function loadResumableSession(): ResumableSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ResumableSession
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('kind' in parsed) ||
      typeof parsed.updatedAt !== 'number'
    ) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveResumableSession(session: ResumableSession): void {
  // Always remember the latest payload so the eventual flush carries
  // the most recent state.
  pendingPayload = session
  const now = Date.now()
  const elapsed = now - lastWriteAt
  if (elapsed >= THROTTLE_MS) {
    // Far enough since the last write — flush immediately.
    flushPending()
  } else if (pendingTimer === null) {
    // Schedule a single trailing write so we don't lose the final state.
    pendingTimer = setTimeout(flushPending, THROTTLE_MS - elapsed)
  }
}

export function clearResumableSession(): void {
  // Cancel any in-flight throttled write so it doesn't resurrect a
  // session the user just discarded.
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
  pendingPayload = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Helper hook: automatically persists `session` whenever the deps change
 * (or clears it when `session` becomes null). Use inside the component
 * that owns the live discussion state.
 */
export function useAutoPersistSession(session: ResumableSession | null): void {
  const lastSerializedRef = useRef<string>('')
  useEffect(() => {
    if (!session) return
    // Avoid redundant writes when the structural payload is identical.
    const payload = JSON.stringify(session)
    if (payload === lastSerializedRef.current) return
    lastSerializedRef.current = payload
    saveResumableSession(session)
  }, [session])
}

/** Read-once-on-mount loader for the App component. */
export function usePendingResume(): [
  ResumableSession | null,
  (next: ResumableSession | null) => void,
] {
  const [pending, setPending] = useState<ResumableSession | null>(() => loadResumableSession())
  return [pending, setPending]
}
