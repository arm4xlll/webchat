// Version this bundle was built with (injected by vite.config.ts → define)
export const CURRENT_VERSION: string = __APP_VERSION__

/**
 * Fetch /version.json (always fresh, no cache) and compare with the
 * version embedded in the current bundle.
 * Returns true when a newer version has been deployed.
 */
export async function isNewVersionAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return false
    const { version } = (await res.json()) as { version: string }
    return version !== CURRENT_VERSION
  } catch {
    return false
  }
}
