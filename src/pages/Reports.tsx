import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useSubscriptions, useCategories, useUserSettings, useExchangeRate, convertCurrency, formatCurrency } from '@/hooks/useSupabase';
import { BarChart3, TrendingUp, Calendar, Tag, Loader2 } from 'lucide-react';
import { SubscriptionIcon } from '@/components/SubscriptionIcon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ReportsPage() {
  const { data: subs = [], isLoading: loadingSubs } = useSubscriptions();
  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const { data: settings } = useUserSettings();
  const currency = settings?.currency || 'BRL';
  const { data: rate = 1 } = useExchangeRate(currency);
  const fmt = (value: number) => formatCurrency(convertCurrency(value, rate), currency);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return subs;
    return subs.filter(s => s.status === filterStatus);
  }, [subs, filterStatus]);

  const totalMonthly = useMemo(() => {
    return filtered.reduce((acc, s) => {
      if (s.status === 'cancelled') return acc;
      if (s.billing_type === 'annual') return acc + s.value / 12;
      return acc + s.value;
    }, 0);
  }, [filtered]);

  const totalAnnual = useMemo(() => {
    return filtered.reduce((acc, s) => {
      if (s.status === 'cancelled') return acc;
      if (s.billing_type === 'annual') return acc + s.value;
      return acc + s.value * 12;
    }, 0);
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filtered.forEach(s => {
      if (s.status === 'cancelled') return;
      if (!map[s.category]) map[s.category] = { total: 0, count: 0 };
      const monthly = s.billing_type === 'annual' ? s.value / 12 : s.value;
      map[s.category].total += monthly;
      map[s.category].count++;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const maxCategoryTotal = byCategory[0]?.total || 1;

  const byStatus = useMemo(() => {
    const map: Record<string, number> = { active: 0, expiring: 0, trial: 0, cancelled: 0 };
    subs.forEach(s => { map[s.status] = (map[s.status] || 0) + 1; });
    return map;
  }, [subs]);

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: 'Ativo', color: 'bg-success' },
    expiring: { label: 'Expirando', color: 'bg-warning' },
    trial: { label: 'Trial', color: 'bg-primary' },
    cancelled: { label: 'Cancelado', color: 'bg-destructive' },
  };

  const upcomingRenewals = useMemo(() => {
    const now = Date.now();
    return subs
      .filter(s => s.status !== 'cancelled')
      .map(s => ({ ...s, daysUntil: Math.ceil((new Date(s.renewal_date).getTime() - now) / 86400000) }))
      .filter(s => s.daysUntil <= 30 && s.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [subs]);

  if (loadingSubs || loadingCats) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão financeira das suas assinaturas</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 bg-surface-2 border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="expiring">Expirando</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Gasto Mensal</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(totalMonthly)}</p>
            <p className="text-xs text-muted-foreground mt-1">{filtered.filter(s => s.status !== 'cancelled').length} assinaturas ativas</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Projeção Anual</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(totalAnnual)}</p>
            <p className="text-xs text-muted-foreground mt-1">Estimativa para 12 meses</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {fmt(filtered.filter(s => s.status !== 'cancelled').length > 0 ? totalMonthly / filtered.filter(s => s.status !== 'cancelled').length : 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Por assinatura/mês</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By category */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Gasto por Categoria (mensal)</h3>
            </div>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-3">
                {byCategory.map(cat => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-foreground font-medium">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{cat.count} assin.</span>
                        <span className="text-xs font-semibold text-foreground tabular-nums">{fmt(cat.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(cat.total / maxCategoryTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By status + upcoming */}
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Distribuição por Status</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(byStatus).map(([status, count]) => {
                  const cfg = statusLabels[status];
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${cfg.color}`} />
                      <span className="text-xs text-muted-foreground flex-1">{cfg.label}</span>
                      <span className="text-xs font-semibold text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Próximas Renovações (30 dias)</h3>
              {upcomingRenewals.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma renovação nos próximos 30 dias</p>
              ) : (
                <div className="space-y-2">
                  {upcomingRenewals.map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SubscriptionIcon url={s.url} name={s.name} />
                        <div>
                          <p className="text-xs font-medium text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.daysUntil === 0 ? 'Hoje' : `Em ${s.daysUntil} dias`}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-foreground tabular-nums">{fmt(s.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
