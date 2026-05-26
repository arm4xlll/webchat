import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { MessageSquare, User, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      setAuth({ id: data.userId, name: data.name, username: data.username }, data.accessToken);
      navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail ?? 'Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-tg-bg px-4">
      {/* Login Card */}
      <div className="w-full max-w-[420px] bg-tg-sidebar-bg border border-tg-border rounded-xl p-8 sm:p-10 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tg-primary text-white mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-tg-text tracking-tight">Вход в WebChat</h1>
          <p className="text-tg-text-secondary mt-2 text-sm">Пожалуйста, войдите в свой аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full pl-10 pr-4 py-3 bg-tg-input-bg border border-tg-border rounded-xl text-tg-text placeholder:text-tg-text-secondary text-[15px] focus:outline-none focus:border-tg-primary transition-colors"
              />
            </div>
          </div>

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
                placeholder="••••••••"
                required
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
                <span>Входим...</span>
              </>
            ) : (
              <span>Войти</span>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-[15px] text-tg-text-secondary">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-tg-primary hover:underline font-medium transition-colors">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}

