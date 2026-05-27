import { useEffect, useState, useCallback } from 'react'
import { isNewVersionAvailable } from '../utils/versionCheck'

const POLL_INTERVAL_MS  = 5 * 60 * 1000 // poll every 5 minutes as fallback
const AUTO_RELOAD_DELAY = 10             // seconds before auto hard-reload

export function useVersionCheck() {
  const [updateReady, setUpdateReady] = useState(false)
  const [countdown,   setCountdown]   = useState(AUTO_RELOAD_DELAY)

  const markReady = useCallback(() => setUpdateReady(true), [])

  const checkNow = useCallback(async () => {
    if (await isNewVersionAvailable()) markReady()
  }, [markReady])

  // 1. Periodic polling (5 min) + tab-focus check
  useEffect(() => {
    const interval = setInterval(checkNow, POLL_INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkNow()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [checkNow])

  // 2. SSE-reconnect signal dispatched by useEventStream on stream.ready
  useEffect(() => {
    const onSseUpdate = () => markReady()
    window.addEventListener('app:update-available', onSseUpdate)
    return () => window.removeEventListener('app:update-available', onSseUpdate)
  }, [markReady])

  // 3. Countdown + auto-reload once update is detected
  useEffect(() => {
    if (!updateReady) return
    setCountdown(AUTO_RELOAD_DELAY)
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(tick); window.location.reload(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [updateReady])

  return {
    updateReady,
    countdown,
    reloadNow: () => window.location.reload(),
  }
}
