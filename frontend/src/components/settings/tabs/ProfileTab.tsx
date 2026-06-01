import { useRef, useState } from 'react';
import { Camera, Check, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useChatStore } from '../../../store/chatStore';
import { updateProfile, uploadAvatar } from '../../../api/users';
import UserAvatar from '../../common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ProfileTab() {
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const isDirty = name.trim() !== user.name || bio.trim() !== (user.bio ?? '');

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
      const merged = { ...user, avatarUrl: updated.avatarUrl ?? undefined };
      updateUser(merged);
      // Propagate avatar change to all conversation member lists immediately,
      // without waiting for the server to broadcast conversation.member_updated.
      useChatStore.getState().updateConversationMember(merged);
    } catch {
      setError('Не удалось загрузить аватар');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center pt-2 pb-2">
        <div className="relative group">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="xl" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
          >
            {uploadingAvatar
              ? <Loader2 className="w-7 h-7 text-white animate-spin" />
              : <Camera className="w-7 h-7 text-white" />
            }
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <p className="mt-2 text-xs text-muted-foreground">Нажмите на аватар, чтобы изменить</p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Имя</Label>
          <Input
            id="profile-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            placeholder="Ваше имя"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-bio">
            Описание{' '}
            <span className="text-muted-foreground/60 font-normal">(необязательно)</span>
          </Label>
          <Textarea
            id="profile-bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Расскажите о себе..."
          />
          <p className="text-right text-xs text-muted-foreground">{bio.length}/500</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-red-400 rounded-xl px-3 py-2 text-sm animate-slide-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !isDirty || !name.trim()}
          className="w-full"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Сохранение...</>
          ) : saved ? (
            <><Check className="w-4 h-4" /> Сохранено</>
          ) : (
            'Сохранить'
          )}
        </Button>
      </div>
    </div>
  );
}
