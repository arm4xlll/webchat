import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Plus, Upload, Loader2, Check } from 'lucide-react';
import { findPackBySticker, getPackBySlug, subscribeToPack, addStickersToExistingPack } from '../../api/stickers';
import { useStickerStore } from '../../store/stickerStore';
import { useAuthStore } from '../../store/authStore';
import type { StickerPack, StickerItem } from '../../types/sticker';
import { isStickerVideoType } from '../../types/sticker';

interface Props {
  /** fileUrl стикера из чата — по нему находим пак */
  fileUrl?: string;
  /** или сразу slug пака (из пикера) */
  slug?: string;
  onClose: () => void;
  /** если передан — клик на стикер его отправляет */
  onSend?: (sticker: StickerItem) => void;
}

interface StickerDraft {
  file: File;
  preview: string;
  isVideo: boolean;
  emojis: string;
}

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif',
                 'video/mp4', 'video/quicktime', 'video/webm'];

export default function StickerPackViewModal({ fileUrl, slug, onClose, onSend }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = useAuthStore(s => s.user);
  const { packs, invalidate, invalidatePackCache, loadUserPacks } = useStickerStore();

  const [pack, setPack] = useState<StickerPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Subscribe state
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Add stickers state
  const [addMode, setAddMode] = useState(false);
  const [drafts, setDrafts] = useState<StickerDraft[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Load pack on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const load = async () => {
      try {
        let loaded: StickerPack;
        if (fileUrl) {
          loaded = await findPackBySticker(fileUrl);
        } else if (slug) {
          loaded = await getPackBySlug(slug);
        } else {
          throw new Error('fileUrl или slug обязателен');
        }
        if (!cancelled) {
          setPack(loaded);
          // Проверяем — есть ли этот пак уже у пользователя
          const alreadyHave = packs.some(p => p.id === loaded.id);
          if (alreadyHave) setSubscribed(true);
        }
      } catch {
        if (!cancelled) setError('Не удалось загрузить стикерпак');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, slug]);

  // Escape closes (add mode first)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (addMode) { setAddMode(false); setDrafts([]); }
        else onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, addMode]);

  const isOwn = pack?.creatorId && user?.id && pack.creatorId === user.id;
  const alreadyInCollection = subscribed || packs.some(p => p.id === pack?.id);

  const handleSubscribe = async () => {
    if (!pack) return;
    setSubscribing(true);
    try {
      await subscribeToPack(pack.slug);
      setSubscribed(true);
      invalidate();
      await loadUserPacks();
    } catch {
      // ignore
    } finally {
      setSubscribing(false);
    }
  };

  // ── Add stickers mode ──────────────────────────────────────────────────────

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter(f => ALLOWED.includes(f.type));
    if (valid.length < arr.length) {
      setUploadError('Некоторые файлы пропущены — допустимы PNG, WEBP, JPEG, GIF, MP4, MOV, WEBM');
    } else {
      setUploadError('');
    }
    const newDrafts: StickerDraft[] = valid.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      isVideo: isStickerVideoType(f.type),
      emojis: '',
    }));
    setDrafts(prev => [...prev, ...newDrafts]);
  }, []);

  const removeDraft = (idx: number) => {
    setDrafts(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleUpload = async () => {
    if (!pack || drafts.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      const updated = await addStickersToExistingPack(
        pack.slug,
        drafts.map(d => ({ emojis: d.emojis })),
        drafts.map(d => d.file)
      );
      drafts.forEach(d => URL.revokeObjectURL(d.preview));
      setPack(updated);
      setDrafts([]);
      setAddMode(false);
      // Сбрасываем кэш стикеров этого пака в сторе
      invalidatePackCache(pack.slug);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setUploadError(msg ?? 'Ошибка при загрузке стикеров');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={() => { if (addMode) { setAddMode(false); setDrafts([]); } else onClose(); }}
      />

      <div className="relative bg-tg-sidebar-bg border border-tg-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[92vh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-5 w-40 bg-tg-hover rounded animate-pulse" />
            ) : (
              <>
                <h2 className="text-[17px] font-semibold text-tg-text leading-tight truncate">
                  {addMode ? 'Добавить стикеры' : (pack?.title ?? '—')}
                </h2>
                {!addMode && pack && (
                  <p className="text-[13px] text-tg-text-secondary mt-0.5">
                    @{pack.slug} · {pack.stickers.length} стикер{plural(pack.stickers.length)}
                  </p>
                )}
              </>
            )}
          </div>
          <button
            onClick={() => { if (addMode) { setAddMode(false); setDrafts([]); } else onClose(); }}
            className="ml-3 p-1.5 rounded-full hover:bg-tg-hover text-tg-text-secondary transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-tg-text-secondary" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 text-sm text-rose-400 text-center px-4">
              {error}
            </div>
          ) : addMode ? (
            /* ── Add stickers grid ── */
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                className="w-full border-2 border-dashed border-tg-border rounded-xl py-5 flex flex-col items-center gap-2 text-tg-text-secondary hover:border-tg-primary hover:text-tg-primary transition-colors cursor-pointer"
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm">Перетащите файлы или нажмите</span>
                <span className="text-xs opacity-70">PNG, WEBP, JPEG, GIF, MP4, MOV, WEBM</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
              />

              {drafts.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {drafts.map((d, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5 bg-tg-input-bg rounded-xl p-2 border border-tg-border">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-tg-hover flex items-center justify-center">
                        {d.isVideo ? (
                          <video src={d.preview} className="w-full h-full object-contain" autoPlay loop muted playsInline preload="metadata" />
                        ) : (
                          <img src={d.preview} alt="" className="w-full h-full object-contain" />
                        )}
                        <button
                          onClick={() => removeDraft(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <input
                        value={d.emojis}
                        onChange={e => setDrafts(prev =>
                          prev.map((st, i) => i === idx ? { ...st, emojis: e.target.value } : st)
                        )}
                        placeholder="😂,🔥"
                        className="w-full bg-tg-bg border border-tg-border rounded-lg px-2 py-1 text-xs text-tg-text placeholder:text-tg-text-secondary outline-none focus:border-tg-primary transition-colors text-center"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-tg-border flex items-center justify-center text-tg-text-secondary hover:border-tg-primary hover:text-tg-primary transition-colors cursor-pointer"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              )}

              {uploadError && <p className="text-sm text-rose-400">{uploadError}</p>}
            </div>
          ) : pack ? (
            /* ── Sticker grid ── */
            <div className="grid grid-cols-4 gap-1">
              {pack.stickers.map(sticker => (
                <StickerCell
                  key={sticker.id}
                  sticker={sticker}
                  onClick={onSend ? (s) => { onSend(s); onClose(); } : undefined}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="shrink-0 px-4 py-3 border-t border-tg-border">
            {addMode ? (
              <div className="flex gap-3">
                <button
                  onClick={() => { setAddMode(false); setDrafts([]); setUploadError(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-tg-text-secondary border border-tg-border hover:bg-tg-hover transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleUpload}
                  disabled={drafts.length === 0 || uploading}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
                    ${drafts.length > 0 && !uploading
                      ? 'bg-tg-primary text-white hover:opacity-90 cursor-pointer'
                      : 'bg-tg-input-bg text-tg-text-secondary cursor-not-allowed opacity-50'}`}
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Добавить
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                {isOwn && (
                  <button
                    onClick={() => setAddMode(true)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-tg-border text-tg-text hover:bg-tg-hover transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить стикеры
                  </button>
                )}
                {!alreadyInCollection ? (
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-tg-primary text-white hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {subscribing
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Plus className="w-4 h-4" />}
                    Добавить себе
                  </button>
                ) : !isOwn ? (
                  <div className="flex-1 py-2.5 rounded-xl text-sm font-medium text-tg-text-secondary border border-tg-border flex items-center justify-center gap-2 select-none">
                    <Check className="w-4 h-4 text-tg-primary" />
                    Уже в коллекции
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function plural(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return '';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'а';
  return 'ов';
}

function StickerCell({ sticker, onClick }: { sticker: StickerItem; onClick?: (s: StickerItem) => void }) {
  const isVideo = isStickerVideoType(sticker.contentType);

  return (
    <button
      onClick={onClick ? () => onClick(sticker) : undefined}
      className={`aspect-square flex items-center justify-center rounded-xl p-1.5 transition-colors
        ${onClick ? 'hover:bg-tg-hover cursor-pointer' : 'cursor-default'}`}
    >
      {isVideo ? (
        <video
          src={sticker.fileUrl}
          className="w-full h-full object-contain"
          autoPlay loop muted playsInline preload="metadata"
        />
      ) : (
        <img
          src={sticker.fileUrl}
          alt=""
          className="w-full h-full object-contain"
          loading="lazy"
        />
      )}
    </button>
  );
}
