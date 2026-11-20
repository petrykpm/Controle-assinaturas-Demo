import { useState, useRef, useEffect } from 'react';
import { Search, Bell, LogOut, CreditCard, CalendarClock, Settings, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptions, formatCurrency } from '@/hooks/useSupabase';
import { useNavigate } from 'react-router-dom';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { data: subs = [] } = useSubscriptions();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search results
  const searchResults = search.trim().length >= 1
    ? subs.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase()) ||
        s.responsible?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 6)
    : [];

  // Notifications
  const now = Date.now();
  const alerts = subs
    .filter(s => s.status !== 'cancelled')
    .map(s => {
      const daysUntil = Math.ceil((new Date(s.renewal_date).getTime() - now) / 86400000);
      return { ...s, daysUntil };
    })
    .filter(s => s.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const statusColors: Record<string, string> = {
    active: 'text-success',
    expiring: 'text-warning',
    trial: 'text-primary',
    cancelled: 'text-destructive',
  };

  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-surface-1">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        {/* Global Search */}
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder="Buscar serviços..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            className="w-64 pl-9 h-9 bg-surface-2 border-border text-sm placeholder:text-muted-foreground focus-visible:ring-primary/30"
          />
          {/* Results dropdown */}
          {searchOpen && search.trim().length >= 1 && (
            <div className="absolute top-full left-0 mt-1 w-80 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
              {searchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado encontrado</p>
              ) : (
                <>
                  <div className="p-2 border-b border-border">
                    <p className="text-xs text-muted-foreground">{searchResults.length} resultado(s)</p>
                  </div>
                  {searchResults.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSearch(''); setSearchOpen(false); navigate('/subscriptions'); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-hover transition-colors text-left border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.category}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-foreground">{formatCurrency(s.value)}</p>
                        <p className={`text-xs ${statusColors[s.status] || 'text-muted-foreground'}`}>
                          {s.status === 'active' ? 'Ativo' : s.status === 'expiring' ? 'Expirando' : s.status === 'trial' ? 'Trial' : 'Cancelado'}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
              <Bell className="h-4 w-4" />
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
            <div className="p-3 border-b border-border">
              <h4 className="text-sm font-medium text-foreground">Notificações</h4>
              <p className="text-xs text-muted-foreground">Renovações nos próximos 30 dias</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma renovação próxima</p>
              ) : (
                alerts.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(a.value)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      a.daysUntil <= 3 ? 'bg-destructive/10 text-destructive' :
                      a.daysUntil <= 7 ? 'bg-warning/10 text-warning' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {a.daysUntil > 0 ? `${a.daysUntil}d` : 'Vencido'}
                    </span>
                  </div>
                ))
              )}
            </div>
            {alerts.length > 0 && (
              <div className="p-2 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => { setNotifOpen(false); navigate('/renewals'); }}>
                  Ver todas as renovações
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
              {initials}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0 bg-card border-border" align="end">
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Conta ativa</p>
                </div>
              </div>
            </div>
            <div className="p-1">
              <button
                onClick={() => navigate('/settings')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
