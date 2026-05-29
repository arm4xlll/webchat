import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { MessageSquare, User, Lock, Loader2, AlertCircle, Mic, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FEATURES = [
  { icon: <MessageSquare className="w-4 h-4" />, text: 'Мгновенные сообщения в реальном времени' },
  { icon: <Mic className="w-4 h-4" />, text: 'Голосовые сообщения и медиафайлы' },
  { icon: <Smile className="w-4 h-4" />, text: 'Стикеры, реакции и пересылка' },
  { icon: <Paperclip className="w-4 h-4" />, text: 'Отправка файлов любого формата' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(name, username, password);
      setAuth({ id: data.userId, name: data.name, username: data.username, bio: data.bio, avatarUrl: data.avatarUrl, isAdmin: data.isAdmin }, data.accessToken);
      navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail ?? 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left branding panel — desktop only */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 bg-primary/5 border-r border-border p-12">
        <div className="flex flex-col items-center text-center max-w-[280px]">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-lg">
            <MessageSquare className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">WebChat</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Общайтесь с людьми быстро, удобно и безопасно
          </p>
          <div className="w-full space-y-3.5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary">
                  {f.icon}
                </div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-8">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-lg">
            <MessageSquare className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">WebChat</h1>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Регистрация</h2>
            <p className="text-muted-foreground mt-1 text-sm">Создайте аккаунт, это займёт секунду</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Имя</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Имя Фамилия"
                  required
                  minLength={2}
                  autoComplete="name"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Юзернейм</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="username"
                  required
                  minLength={3}
                  pattern="^[a-zA-Z0-9_]+$"
                  title="Только латиница, цифры и _"
                  autoComplete="username"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">Только латинские буквы, цифры и _ (без пробелов)</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pl-9"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-red-400 rounded-xl p-3 text-sm animate-slide-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full mt-1" size="lg">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создаём...
                </>
              ) : 'Создать аккаунт'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold transition-colors">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
