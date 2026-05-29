export interface StickerItem {
  id: string;
  fileUrl: string;
  contentType: string;
  mediaType: 'IMAGE' | 'VIDEO';
  fileSize: number;
  emojis: string; // comma-separated: "😂,🤣,😄"
}

export interface StickerPack {
  id: string;
  slug: string;
  title: string; // бэкенд вернул поле title, не name
  stickers: StickerItem[];
}

export function isStickerMessage(fileUrl?: string, fileName?: string): boolean {
  return fileName === 'sticker' && !!fileUrl;
}

export function isStickerVideoType(contentType: string): boolean {
  return contentType.startsWith('video/');
}
