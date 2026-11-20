import { AppLayout } from '@/components/AppLayout';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { useSubscriptions, useCategories, useUserSettings, useExchangeRate, convertCurrency, formatCurrency } from '@/hooks/useSupabase';
import { DollarSign, CreditCard, Brain, AlertTriangle, CalendarClock, Loader2 } from 'lucide-react';
import { SubscriptionIcon } from '@/components/SubscriptionIcon';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

const CustomTooltip = ({ active, payload, label, currency, rate }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs text-muted-foreground">
          {p.name}: {formatCurrency(convertCurrency(p.value, rate), currency)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { data: subs = [], isLoading } = useSubscriptions();
  const { data: categories = [] } = useCategories();
  const { data: settings } = useUserSettings();
  const currency = settings?.currency || 'BRL';
  const { data: rate = 1 } = useExchangeRate(currency);

  const fmt = (value: number) => formatCurrency(convertCurrency(value, rate), currency);

  const stats = useMemo(() => {
    const active = subs.filter(s => s.status !== 'cancelled');
    const totalMonthly = active.reduce((a, b) => a + b.value, 0);
    const totalAI = active.filter(s => s.category === 'AI').reduce((a, b) => a + b.value, 0);
    const activeCount = active.length;

    const categoryData = categories.map(cat => ({
      name: cat.name,
      value: active.filter(s => s.category === cat.name).reduce((a, b) => a + b.value, 0),
      color: cat.color,
    })).filter(c => c.value > 0);

    const topServices = [...active].sort((a, b) => b.value - a.value).slice(0, 5);
    const upcomingRenewals = [...active]
      .sort((a, b) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime())
      .slice(0, 5);

    return { totalMonthly, totalAI, activeCount, categoryData, topServices, upcomingRenewals };
  }, [subs, categories]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral dos custos recorrentes</p>
          </div>
          {currency !== 'BRL' && (
            <span className="text-xs text-muted-foreground bg-surface-2 px-3 py-1 rounded-full border border-border">
              Cotação ao vivo · 1 BRL = {rate.toFixed(4)} {currency}
            </span>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Mensal" value={fmt(stats.totalMonthly)} change={0} icon={<DollarSign className="h-5 w-5" />} accent="primary" />
          <MetricCard title="Total Anual (est.)" value={fmt(stats.totalMonthly * 12)} change={0} icon={<CreditCard className="h-5 w-5" />} accent="success" />
          <MetricCard title="Assinaturas Ativas" value={String(stats.activeCount)} change={0} icon={<CreditCard className="h-5 w-5" />} />
          <MetricCard title="Gastos com IA" value={fmt(stats.totalAI)} change={0} icon={<Brain className="h-5 w-5" />} accent="warning" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Gastos por Categoria</h3>
            {stats.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={stats.categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
                    {stats.categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip currency={currency} rate={rate} />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-20">Adicione assinaturas para ver os gráficos</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Distribuição</h3>
            <div className="space-y-2">
              {stats.categoryData.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="text-foreground font-medium">{fmt(c.value)}</span>
                </div>
              ))}
              {stats.categoryData.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum dado ainda</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Serviços Mais Caros</h3>
            <div className="space-y-3">
              {stats.topServices.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <SubscriptionIcon url={s.url} name={s.name} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.category}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{fmt(s.value)}<span className="text-xs text-muted-foreground font-normal">/mês</span></span>
                </div>
              ))}
              {stats.topServices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma assinatura</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Próximas Renovações
            </h3>
            <div className="space-y-3">
              {stats.upcomingRenewals.map((s) => {
                const daysUntil = Math.ceil((new Date(s.renewal_date).getTime() - Date.now()) / 86400000);
                const urgent = daysUntil <= 7;
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      {urgent && <AlertTriangle className="h-4 w-4 text-warning" />}
                      <SubscriptionIcon url={s.url} name={s.name} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(s.renewal_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={s.status} />
                      <p className={`text-xs mt-1 ${urgent ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                        {daysUntil > 0 ? `${daysUntil} dias` : 'Vencido'}
                      </p>
                    </div>
                  </div>
                );
              })}
              {stats.upcomingRenewals.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma renovação</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
