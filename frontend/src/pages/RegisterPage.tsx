import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { UserPlus, User, Lock, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[420px]">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground mx-auto mb-3">
            <UserPlus className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Регистрация</CardTitle>
          <CardDescription>Создайте аккаунт в WebChat</CardDescription>
        </CardHeader>

        <CardContent>
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
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground pl-0.5">
                Только латинские буквы, цифры и символ подчеркивания (_)
              </p>
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

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создаём...
                </>
              ) : (
                'Зарегистрироваться'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold transition-colors">
              Войти
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
