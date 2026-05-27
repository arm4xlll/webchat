import { useEffect, useState } from 'react';
import {
  X, User, Palette, Smartphone, ChevronLeft,
} from 'lucide-react';
import ProfileTab from './tabs/ProfileTab';
import ThemeTab from './tabs/ThemeTab';
import SessionsTab from './tabs/SessionsTab';

type TabId = 'profile' | 'theme' | 'sessions';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  section: string;
}

const NAV: NavItem[] = [
  { id: 'profile', label: 'Профиль', icon: <User className="w-4 h-4" />, section: 'Аккаунт' },
  { id: 'theme', label: 'Тема', icon: <Palette className="w-4 h-4" />, section: 'Аккаунт' },
  { id: 'sessions', label: 'Сессии', icon: <Smartphone className="w-4 h-4" />, section: 'Сессии' },
];

const SECTION_ORDER = ['Аккаунт', 'Сессии'];

const TAB_TITLES: Record<TabId, string> = {
  profile: 'Профиль',
  theme: 'Тема',
  sessions: 'Активные сессии',
};

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  // On mobile, show 'nav' pane or 'content' pane
  const [mobilePane, setMobilePane] = useState<'nav' | 'content'>('nav');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    setMobilePane('content');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-2xl bg-tg-sidebar-bg border border-tg-border rounded-2xl overflow-hidden shadow-2xl animate-slide-in"
        style={{ height: 'min(90dvh, 620px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex h-full">

          {/* ── Sidebar nav ──────────────────────────────────────────────── */}
          <div
            className={`
              ${mobilePane === 'nav' ? 'flex' : 'hidden'} md:flex
              flex-col w-full md:w-56 border-r border-tg-border bg-tg-sidebar-bg shrink-0
            `}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-tg-border">
              <h2 className="text-base font-semibold text-tg-text">Настройки</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav items grouped by section */}
            <div className="flex-1 overflow-y-auto py-2">
              {SECTION_ORDER.map(section => {
                const items = NAV.filter(n => n.section === section);
                return (
                  <div key={section} className="mb-1">
                    <p className="px-4 py-1.5 text-[11px] font-semibold text-tg-text-secondary uppercase tracking-wider">
                      {section}
                    </p>
                    {items.map(item => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => selectTab(item.id)}
                          className={`
                            w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer
                            ${isActive
                              ? 'bg-tg-primary/15 text-tg-primary'
                              : 'text-tg-text hover:bg-tg-hover'
                            }
                          `}
                        >
                          <span className={isActive ? 'text-tg-primary' : 'text-tg-text-secondary'}>
                            {item.icon}
                          </span>
                          <span className="text-[14px] font-medium">{item.label}</span>
                          {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-tg-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Content panel ────────────────────────────────────────────── */}
          <div
            className={`
              ${mobilePane === 'content' ? 'flex' : 'hidden'} md:flex
              flex-col flex-1 min-w-0
            `}
          >
            {/* Content header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-tg-border shrink-0">
              {/* Back button — mobile only */}
              <button
                onClick={() => setMobilePane('nav')}
                className="md:hidden p-1.5 -ml-1 rounded-full text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-[15px] font-semibold text-tg-text">{TAB_TITLES[activeTab]}</h3>
              {/* Close on desktop — in the sidebar, but duplicate here for mobile content pane */}
              <button
                onClick={onClose}
                className="md:hidden ml-auto p-1.5 rounded-full text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'theme' && <ThemeTab />}
              {activeTab === 'sessions' && <SessionsTab />}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
