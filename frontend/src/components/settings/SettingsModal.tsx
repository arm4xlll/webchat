import { useEffect, useRef, useState } from 'react';
import { X, Camera, Check, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { updateProfile, uploadAvatar } from '../../api/users';
import UserAvatar from '../common/UserAvatar';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);

  // Initialized from user on mount — component is only rendered when open
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!user) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateProfile(name.trim(), bio.trim());
      updateUser({ ...user, name: updated.name, bio: updated.bio ?? undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const updated = await uploadAvatar(file);
      updateUser({ ...user, avatarUrl: updated.avatarUrl ?? undefined });
    } catch {
      setError('Не удалось загрузить аватар');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isDirty = name.trim() !== user.name || bio.trim() !== (user.bio ?? '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm bg-tg-sidebar-bg border border-tg-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-tg-border">
          <h2 className="text-base font-semibold text-tg-text">Настройки</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-tg-text-secondary hover:text-white hover:bg-tg-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar section */}
        <div className="flex flex-col items-center pt-6 pb-4 px-6">
          <div className="relative">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="xl" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
            >
              {uploadingAvatar
                ? <Loader2 className="w-7 h-7 text-white animate-spin" />
                : <Camera className="w-7 h-7 text-white" />
              }
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="mt-2 text-xs text-tg-text-secondary">Нажмите на аватар, чтобы изменить</p>
        </div>

        {/* Form */}
        <div className="px-5 pb-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-tg-text-secondary mb-1.5">Имя</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              placeholder="Ваше имя"
              className="w-full px-3.5 py-2.5 bg-tg-input-bg border border-tg-border rounded-xl text-tg-text text-[15px] placeholder:text-tg-text-secondary focus:outline-none focus:border-tg-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-tg-text-secondary mb-1.5">
              Описание <span className="text-tg-text-secondary/60">(необязательно)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Расскажите о себе..."
              className="w-full px-3.5 py-2.5 bg-tg-input-bg border border-tg-border rounded-xl text-tg-text text-[15px] placeholder:text-tg-text-secondary focus:outline-none focus:border-tg-primary transition-colors resize-none"
            />
            <p className="text-right text-xs text-tg-text-secondary mt-1">{bio.length}/500</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !isDirty || !name.trim()}
            className="w-full py-3 px-4 bg-tg-primary text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none cursor-pointer hover:opacity-90"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Сохранение...</>
            ) : saved ? (
              <><Check className="w-4 h-4" /> Сохранено</>
            ) : (
              'Сохранить'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
