import api from './client';
import type { LinkPreviewData } from '../types';

// Module-level cache: URL → data (null if no preview available)
const cache = new Map<string, LinkPreviewData | null>();
// Track in-flight requests to avoid duplicate fetches
const inflight = new Map<string, Promise<LinkPreviewData | null>>();

export async function getLinkPreview(url: string): Promise<LinkPreviewData | null> {
  if (cache.has(url)) return cache.get(url)!;
  if (inflight.has(url)) return inflight.get(url)!;

  const promise = api.get<LinkPreviewData>(`/meta?url=${encodeURIComponent(url)}`)
    .then(res => {
      const data = res.status === 204 ? null : res.data;
      cache.set(url, data);
      inflight.delete(url);
      return data;
    })
    .catch(() => {
      cache.set(url, null);
      inflight.delete(url);
      return null;
    });

  inflight.set(url, promise);
  return promise;
}

/** Extract the first HTTP(S) URL from a string */
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>)"]+/);
  return match ? match[0] : null;
}
