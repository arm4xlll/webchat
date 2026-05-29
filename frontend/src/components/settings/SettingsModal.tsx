import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Palette, Smartphone, ChevronLeft, Shield, X } from 'lucide-react';
import ProfileTab from './tabs/ProfileTab';
import ThemeTab from './tabs/ThemeTab';
import SessionsTab from './tabs/SessionsTab';
import { useAuthStore } from '../../store/authStore';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
  const [mobilePane, setMobilePane] = useState<'nav' | 'content'>('nav');
  const isAdmin = useAuthStore(s => s.user?.isAdmin);
  const navigate = useNavigate();

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    setMobilePane('content');
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ height: 'min(90dvh, 620px)' }}
        >
          <DialogPrimitive.Title className="sr-only">Настройки</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Настройки аккаунта, темы и сессий</DialogPrimitive.Description>

          <div className="flex h-full">
            {/* Sidebar */}
            <div className={cn(
              mobilePane === 'nav' ? 'flex' : 'hidden',
              'md:flex flex-col w-full md:w-56 border-r border-border bg-card shrink-0',
            )}>
              <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
                <span className="text-sm font-semibold text-foreground">Настройки</span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ScrollArea className="flex-1">
                <div className="py-2">
                  {SECTION_ORDER.map((section, sectionIdx) => {
                    const items = NAV.filter(n => n.section === section);
                    return (
                      <div key={section}>
                        {sectionIdx > 0 && <Separator className="my-1 mx-3" />}
                        <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {section}
                        </p>
                        {items.map(item => {
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => selectTab(item.id)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer rounded-none',
                                isActive
                                  ? 'bg-primary/15 text-primary'
                                  : 'text-foreground hover:bg-secondary',
                              )}
                            >
                              <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>
                                {item.icon}
                              </span>
                              <span className="text-[13.5px] font-medium">{item.label}</span>
                              {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}

                  {isAdmin && (
                    <div className="mt-1 pt-2 border-t border-border mx-3">
                      <button
                        onClick={() => { onClose(); navigate('/admin'); }}
                        className="w-full flex items-center gap-3 px-1 py-2.5 text-left transition-colors cursor-pointer rounded-lg text-foreground hover:bg-secondary group"
                      >
                        <span className="text-muted-foreground group-hover:text-violet-400 transition-colors">
                          <Shield className="w-4 h-4" />
                        </span>
                        <span className="text-[13.5px] font-medium group-hover:text-violet-400 transition-colors">
                          Панель администратора
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Content panel */}
            <div className={cn(
              mobilePane === 'content' ? 'flex' : 'hidden',
              'md:flex flex-col flex-1 min-w-0',
            )}>
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
                <button
                  onClick={() => setMobilePane('nav')}
                  className="md:hidden p-1.5 -ml-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-[15px] font-semibold text-foreground">{TAB_TITLES[activeTab]}</h3>
                <button
                  onClick={onClose}
                  className="md:hidden ml-auto p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-5 py-5">
                  {activeTab === 'profile' && <ProfileTab />}
                  {activeTab === 'theme' && <ThemeTab />}
                  {activeTab === 'sessions' && <SessionsTab />}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
