import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { UserPlus, User, Lock, Loader2, AlertCircle } from 'lucide-react';

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
      setAuth({ id: data.userId, name: data.name, username: data.username, bio: data.bio, avatarUrl: data.avatarUrl }, data.accessToken);
      navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail ?? 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-tg-bg px-4">
      {/* Register Card */}
      <div className="w-full max-w-[440px] bg-tg-sidebar-bg border border-tg-border rounded-xl p-8 sm:p-10 shadow-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tg-primary text-white mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-tg-text tracking-tight">Регистрация</h1>
          <p className="text-tg-text-secondary mt-2 text-sm">Создайте аккаунт в WebChat</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Input */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-tg-text-secondary">
              Имя
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-tg-text-secondary">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Имя Фамилия"
                required
                minLength={2}
                className="w-full pl-10 pr-4 py-3 bg-tg-input-bg border border-tg-border rounded-xl text-tg-text placeholder:text-tg-text-secondary text-[15px] focus:outline-none focus:border-tg-primary transition-colors"
              />
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-tg-text-secondary">
              Юзернейм
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-tg-text-secondary">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                required
                minLength={3}
                pattern="^[a-zA-Z0-9_]+$"
                title="Только латиница, цифры и _"
                className="w-full pl-10 pr-4 py-3 bg-tg-input-bg border border-tg-border rounded-xl text-tg-text placeholder:text-tg-text-secondary text-[15px] focus:outline-none focus:border-tg-primary transition-colors"
              />
            </div>
            <div className="text-[12px] text-tg-text-secondary mt-1 pl-1">
              Только латинские буквы, цифры и символ подчеркивания (_)
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-tg-text-secondary">
              Пароль
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-tg-text-secondary">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-tg-input-bg border border-tg-border rounded-xl text-tg-text placeholder:text-tg-text-secondary text-[15px] focus:outline-none focus:border-tg-primary transition-colors"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3 text-sm animate-slide-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-tg-primary hover:opacity-90 text-white font-medium text-[15px] rounded-xl transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Создаём...</span>
              </>
            ) : (
              <span>Зарегистрироваться</span>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-[15px] text-tg-text-secondary">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-tg-primary hover:underline font-medium transition-colors">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}

