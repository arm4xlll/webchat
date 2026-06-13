import { useRef, useState } from 'react';
import { X, Plus, Loader2, Upload, ChevronDown } from 'lucide-react';
import { createStickerPack } from '../../api/stickers';
import { useStickerStore } from '../../store/stickerStore';
import { isStickerVideoType } from '../../types/sticker';
import { useTranslation } from '../../hooks/useTranslation';

interface Props {
  onClose: () => void;
}

interface StickerDraft {
  file: File;
  preview: string;
  isVideo: boolean;
  emojis: string;
}

function autoSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  const suffix = Math.random().toString(36).slice(2, 7);
  return base ? `${base}-${suffix}` : `pack-${suffix}`;
}

export default function CreatePackModal({ onClose }: Props) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { invalidate, loadUserPacks } = useStickerStore();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugExpanded, setSlugExpanded] = useState(false);
  const [stickers, setStickers] = useState<StickerDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif',
                   'video/mp4', 'video/quicktime', 'video/webm'];

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter(f => ALLOWED.includes(f.type));
    if (valid.length < arr.length) {
      setError(t('stickers.filesSkipped'));
    }
    const drafts: StickerDraft[] = valid.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      isVideo: isStickerVideoType(f.type),
      emojis: '',
    }));
    setStickers(prev => [...prev, ...drafts]);
  };

  const removeSticker = (idx: number) => {
    setStickers(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched && slugExpanded) setSlug(autoSlug(val));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError(t('stickers.nameRequired')); return; }
    if (stickers.length === 0) { setError(t('stickers.stickersRequired')); return; }

    const effectiveSlug = slug.trim() || autoSlug(title.trim());
    if (!/^[a-z0-9_-]{3,64}$/.test(effectiveSlug)) {
      setError(t('stickers.slugInvalid'));
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await createStickerPack(
        {
          slug: effectiveSlug,
          title,
          stickers: stickers.map(s => ({ emojis: s.emojis })),
        },
        stickers.map(s => s.file)
      );
      stickers.forEach(s => URL.revokeObjectURL(s.preview));
      invalidate();
      await loadUserPacks();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? t('stickers.createPackError'));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = title.trim() && stickers.length > 0 && !submitting;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-tg-sidebar-bg border border-tg-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-[17px] font-semibold text-tg-text">{t('stickers.newPackTitle')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-tg-hover text-tg-text-secondary cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-tg-text-secondary uppercase tracking-wide block mb-1.5">
              {t('stickers.packName')}
            </label>
            <input
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder={t('stickers.packNamePlaceholder')}
              maxLength={128}
              className="w-full bg-tg-input-bg border border-tg-border rounded-xl px-3.5 py-2 text-[15px] text-tg-text placeholder:text-tg-text-secondary outline-none focus:border-tg-primary transition-colors"
            />
          </div>

          {/* Slug — скрыт по умолчанию */}
          <div>
            <button
              type="button"
              onClick={() => setSlugExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-tg-text-secondary hover:text-tg-text transition-colors cursor-pointer select-none"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${slugExpanded ? 'rotate-180' : ''}`} />
              {t('stickers.packSlug')}
            </button>
            {slugExpanded && (
              <div className="mt-2">
                <input
                  value={slug}
                  onChange={e => { setSlug(e.target.value); setSlugTouched(true); }}
                  placeholder="my-stickers"
                  maxLength={64}
                  className="w-full bg-tg-input-bg border border-tg-border rounded-xl px-3.5 py-2 text-[15px] text-tg-text placeholder:text-tg-text-secondary outline-none focus:border-tg-primary transition-colors font-mono"
                />
                <p className="text-[11px] text-tg-text-secondary mt-1">
                  {t('stickers.packSlugHint')}
                </p>
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div>
            <label className="text-xs font-semibold text-tg-text-secondary uppercase tracking-wide block mb-1.5">
              {t('stickers.packStickers')}
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              className="w-full border-2 border-dashed border-tg-border rounded-xl py-5 flex flex-col items-center gap-2 text-tg-text-secondary hover:border-tg-primary hover:text-tg-primary transition-colors cursor-pointer"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm">{t('stickers.dragOrClick')}</span>
              <span className="text-xs opacity-70">{t('stickers.dragOrClickFormats')}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>

          {/* Sticker drafts */}
          {stickers.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {stickers.map((s, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 bg-tg-input-bg rounded-xl p-2 border border-tg-border">
                  {/* Preview */}
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-tg-hover flex items-center justify-center">
                    {s.isVideo ? (
                      <video src={s.preview} className="w-full h-full object-contain"
                        autoPlay loop muted playsInline preload="metadata" />
                    ) : (
                      <img src={s.preview} alt="" className="w-full h-full object-contain" />
                    )}
                    <button
                      onClick={() => removeSticker(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Emoji input */}
                  <input
                    value={s.emojis}
                    onChange={e => setStickers(prev =>
                      prev.map((st, i) => i === idx ? { ...st, emojis: e.target.value } : st)
                    )}
                    placeholder="😂,🔥"
                    className="w-full bg-tg-bg border border-tg-border rounded-lg px-2 py-1 text-xs text-tg-text placeholder:text-tg-text-secondary outline-none focus:border-tg-primary transition-colors text-center"
                  />
                </div>
              ))}

              {/* Add more */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-tg-border flex items-center justify-center text-tg-text-secondary hover:border-tg-primary hover:text-tg-primary transition-colors cursor-pointer"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          )}

          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-tg-border shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-tg-text-secondary hover:text-tg-text transition-colors cursor-pointer">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2
              ${canSubmit
                ? 'bg-tg-primary text-white hover:opacity-90 cursor-pointer'
                : 'bg-tg-input-bg text-tg-text-secondary cursor-not-allowed opacity-50'}`}
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('stickers.createPackBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
