import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import {
  useSubscriptions, useCreateSubscription, useUpdateSubscription, useDeleteSubscription,
  useCategories, formatCurrency, useCreatePayment,
  type SubscriptionStatus, type BillingType, type RiskLevel,
} from '@/hooks/useSupabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, Pencil, Trash2, ArrowUpDown, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const billingTypes: { value: BillingType; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'annual', label: 'Anual' },
  { value: 'usage', label: 'Por uso' },
];
const statuses: { value: SubscriptionStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'expiring', label: 'Expirando' },
  { value: 'trial', label: 'Trial' },
  { value: 'cancelled', label: 'Cancelado' },
];

const riskLevels: { value: RiskLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Baixo', color: 'text-green-500' },
  { value: 'medium', label: 'Médio', color: 'text-yellow-500' },
  { value: 'high', label: 'Alto', color: 'text-orange-500' },
  { value: 'critical', label: 'Crítico', color: 'text-red-500' },
];

const emptyForm = {
  name: '', category: '', value: 0, billing_type: 'monthly' as BillingType,
  renewal_date: '', status: 'active' as SubscriptionStatus, responsible: '', notes: '', url: '',
  risk_level: null as RiskLevel | null, acquisition_date: '',
};

function getFavicon(url: string) {
  if (!url) return null;
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

function normalizeUrl(url: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
}

type SortKey = 'name' | 'value' | 'renewal_date' | 'category';

export default function SubscriptionsPage() {
  const { data: subs = [], isLoading } = useSubscriptions();
  const { data: categories = [] } = useCategories();
  const createSub = useCreateSubscription();
  const updateSub = useUpdateSubscription();
  const deleteSub = useDeleteSubscription();
  const createPayment = useCreatePayment();

  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<typeof subs[0] | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, paid_at: new Date().toISOString().split('T')[0], notes: '' });

  const categoryNames = categories.map(c => c.name);
  const today = new Date().toISOString().split('T')[0];

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    subs.forEach(s => {
      if (s.renewal_date) months.add(s.renewal_date.slice(0, 7));
      if (s.acquisition_date) months.add(s.acquisition_date.slice(0, 7));
    });
    return [...months].sort().reverse();
  }, [subs]);

  const filtered = useMemo(() => {
    let result = subs.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()) ||
      s.responsible?.toLowerCase().includes(search.toLowerCase())
    );
    if (filterCat !== 'all') result = result.filter(s => s.category === filterCat);
    if (filterStatus !== 'all') result = result.filter(s => s.status === filterStatus);
    if (filterMonth) result = result.filter(s =>
      (s.renewal_date && s.renewal_date.startsWith(filterMonth)) ||
      (s.acquisition_date && s.acquisition_date.startsWith(filterMonth))
    );
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'value') cmp = a.value - b.value;
      else if (sortKey === 'renewal_date') cmp = new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime();
      else cmp = (a[sortKey] as string).localeCompare(b[sortKey] as string);
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [subs, search, filterCat, filterStatus, filterMonth, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Nome obrigatório';
    if (!form.category) errors.category = 'Categoria obrigatória';
    if (!form.value || form.value <= 0) errors.value = 'Valor deve ser maior que zero';
    if (!form.acquisition_date) {
      errors.acquisition_date = 'Data de aquisição obrigatória';
    }
    if (form.billing_type !== 'usage' && form.renewal_date && form.renewal_date < today && form.status === 'active') {
      errors.renewal_date = 'Data de renovação está no passado';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Corrija os campos destacados');
      return;
    }
    const sanitized = {
      ...form,
      name: form.name.trim(),
      renewal_date: form.renewal_date || null,
      acquisition_date: form.acquisition_date || null,
      responsible: form.responsible.trim(),
      notes: form.notes.trim(),
      url: form.url.trim(),
    };
    try {
      if (editingId) {
        await updateSub.mutateAsync({ id: editingId, ...sanitized });
        toast.success('Assinatura atualizada');
      } else {
        await createSub.mutateAsync(sanitized);
        toast.success('Assinatura adicionada');
      }
      setForm(emptyForm);
      setFormErrors({});
      setEditingId(null);
      setShowForm(false);
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || 'Tente novamente'}`);
    }
  };

  const handleEdit = (sub: typeof subs[0]) => {
    setForm({
      name: sub.name, category: sub.category, value: sub.value,
      billing_type: sub.billing_type, renewal_date: sub.renewal_date,
      risk_level: sub.risk_level ?? null, acquisition_date: sub.acquisition_date ?? '',
      status: sub.status, responsible: sub.responsible, notes: sub.notes,
      url: (sub as any).url || '',
    });
    setFormErrors({});
    setEditingId(sub.id);
    setShowForm(true);
  };

  const handleRegisterPayment = async () => {
    if (!paymentDialog) return;
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      toast.error('Informe o valor pago');
      return;
    }
    try {
      await createPayment.mutateAsync({
        subscription_id: paymentDialog.id,
        amount: paymentForm.amount,
        paid_at: paymentForm.paid_at,
        notes: paymentForm.notes,
      });
      toast.success('Pagamento registrado!');
      setPaymentDialog(null);
      setPaymentForm({ amount: 0, paid_at: new Date().toISOString().split('T')[0], notes: '' });
    } catch {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleDelete = async () => {
    if (deleteDialog) {
      try {
        await deleteSub.mutateAsync(deleteDialog);
        toast.success('Assinatura removida');
      } catch {
        toast.error('Erro ao remover');
      }
      setDeleteDialog(null);
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

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
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Assinaturas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie todas as assinaturas e serviços</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, categoria..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-surface-2 border-border" />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-36 bg-surface-2 border-border"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categoryNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 bg-surface-2 border-border"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMonth || 'all'} onValueChange={v => setFilterMonth(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40 bg-surface-2 border-border"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthOptions.map(m => {
                const [y, mo] = m.split('-');
                const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                return <SelectItem key={m} value={m}>{label.charAt(0).toUpperCase() + label.slice(1)}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Button onClick={() => { setForm(emptyForm); setFormErrors({}); setEditingId(null); setShowForm(true); }} className="ml-auto gap-1.5 gradient-primary text-primary-foreground border-0">
            <Plus className="h-4 w-4" /> Nova assinatura
          </Button>
        </div>

        {/* Results info */}
        {(search || filterMonth) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {search && <span>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{search}"</span>}
            {filterMonth && (
              <span>
                <span className="font-semibold text-foreground">{filtered.length}</span> assinatura{filtered.length !== 1 ? 's' : ''} neste mês
                {' · '}Total: <span className="font-semibold text-foreground">{formatCurrency(filtered.reduce((acc, s) => acc + s.value, 0))}</span>
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-4 py-3"><SortHeader label="Serviço" field="name" /></th>
                  <th className="text-left px-4 py-3"><SortHeader label="Categoria" field="category" /></th>
                  <th className="text-right px-4 py-3"><SortHeader label="Valor" field="value" /></th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-3"><SortHeader label="Renovação" field="renewal_date" /></th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Risco</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => {
                  const favicon = getFavicon((sub as any).url || '');
                  const subUrl = normalizeUrl((sub as any).url || '');
                  const renewalDate = new Date(sub.renewal_date + 'T00:00:00');
                  const isPast = sub.renewal_date < today && sub.status === 'active';
                  return (
                    <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {favicon ? (
                            <img src={favicon} alt="" className="h-4 w-4 rounded shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="h-4 w-4 rounded bg-surface-3 shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-medium text-foreground">{sub.name}</p>
                              {subUrl && (
                                <a href={subUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" onClick={e => e.stopPropagation()}>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {sub.responsible && <p className="text-xs text-muted-foreground">{sub.responsible}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground bg-surface-3 rounded px-2 py-0.5">{sub.category}</span></td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-foreground tabular-nums">{formatCurrency(sub.value)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{billingTypes.find(b => b.value === sub.billing_type)?.label}</td>
                      <td className="px-4 py-3">
                        <p className={`text-xs ${isPast ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {renewalDate.toLocaleDateString('pt-BR')}
                          {isPast && ' ⚠️'}
                        </p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                      <td className="px-4 py-3">
                        {sub.risk_level ? (
                          <span className={`text-xs font-medium ${riskLevels.find(r => r.value === sub.risk_level)?.color}`}>
                            ● {riskLevels.find(r => r.value === sub.risk_level)?.label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setPaymentDialog(sub); setPaymentForm({ amount: sub.value, paid_at: new Date().toISOString().split('T')[0], notes: '' }); }} className="p-1.5 rounded hover:bg-success/10 text-muted-foreground hover:text-success transition-colors" title="Registrar pagamento"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleEdit(sub)} className="p-1.5 rounded hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDeleteDialog(sub.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    {search ? `Nenhum resultado para "${search}"` : 'Nenhuma assinatura encontrada'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setFormErrors({}); }}>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editingId ? 'Editar' : 'Nova'} Assinatura</DialogTitle>
              <DialogDescription className="text-muted-foreground">Preencha os dados do serviço</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs">Nome do serviço *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`mt-1 bg-surface-2 border-border ${formErrors.name ? 'border-destructive' : ''}`} />
                {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs">URL do serviço</Label>
                <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://spotify.com" className="mt-1 bg-surface-2 border-border" />
                <p className="text-xs text-muted-foreground mt-0.5">O ícone do serviço será carregado automaticamente</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Categoria *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className={`mt-1 bg-surface-2 border-border ${formErrors.category ? 'border-destructive' : ''}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{categoryNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                {formErrors.category && <p className="text-xs text-destructive mt-1">{formErrors.category}</p>}
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Valor (R$) *</Label>
                <Input type="number" min="0" step="0.01" value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} className={`mt-1 bg-surface-2 border-border ${formErrors.value ? 'border-destructive' : ''}`} />
                {formErrors.value && <p className="text-xs text-destructive mt-1">{formErrors.value}</p>}
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Tipo de cobrança</Label>
                <Select value={form.billing_type} onValueChange={v => setForm(f => ({ ...f, billing_type: v as BillingType }))}>
                  <SelectTrigger className="mt-1 bg-surface-2 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{billingTypes.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as SubscriptionStatus }))}>
                  <SelectTrigger className="mt-1 bg-surface-2 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Nível de Risco</Label>
                <Select value={form.risk_level ?? ''} onValueChange={v => setForm(f => ({ ...f, risk_level: v as RiskLevel || null }))}>
                  <SelectTrigger className="mt-1 bg-surface-2 border-border"><SelectValue placeholder="Selecionar risco" /></SelectTrigger>
                  <SelectContent>
                    {riskLevels.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <span className={r.color}>● </span>{r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Aquisição *</Label>
                  <Input type="date" value={form.acquisition_date ?? ''} onChange={e => setForm(f => ({ ...f, acquisition_date: e.target.value }))} className={`mt-1 bg-surface-2 border-border ${formErrors.acquisition_date ? 'border-destructive' : ''}`} />
                  {formErrors.acquisition_date && <p className="text-xs text-destructive mt-1">{formErrors.acquisition_date}</p>}
                </div>
                {form.billing_type !== 'usage' && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Data de Renovação</Label>
                    <Input type="date" value={form.renewal_date} onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))} className={`mt-1 bg-surface-2 border-border ${formErrors.renewal_date ? 'border-destructive' : ''}`} />
                    {formErrors.renewal_date && <p className="text-xs text-destructive mt-1">{formErrors.renewal_date}</p>}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Responsável</Label>
                <Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} className="mt-1 bg-surface-2 border-border" />
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs">Observações</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 bg-surface-2 border-border" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-border text-muted-foreground">Cancelar</Button>
              <Button onClick={handleSave} disabled={createSub.isPending || updateSub.isPending} className="gradient-primary text-primary-foreground border-0">
                {(createSub.isPending || updateSub.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground">Registrar Pagamento</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {paymentDialog?.name} — confirme o valor e a data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-muted-foreground text-xs">Valor pago (R$)</Label>
                <Input type="number" min="0" step="0.01" value={paymentForm.amount || ''} onChange={e => setPaymentForm(f => ({ ...f, amount: Number(e.target.value) }))} className="mt-1 bg-surface-2 border-border" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Data do pagamento</Label>
                <Input type="date" value={paymentForm.paid_at} onChange={e => setPaymentForm(f => ({ ...f, paid_at: e.target.value }))} className="mt-1 bg-surface-2 border-border" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Observação (opcional)</Label>
                <Input value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: Fatura de junho" className="mt-1 bg-surface-2 border-border" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialog(null)} className="border-border text-muted-foreground">Cancelar</Button>
              <Button onClick={handleRegisterPayment} disabled={createPayment.isPending} className="gradient-primary text-primary-foreground border-0">
                {createPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground">Confirmar exclusão</DialogTitle>
              <DialogDescription className="text-muted-foreground">Esta ação não pode ser desfeita. Deseja remover esta assinatura?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialog(null)} className="border-border text-muted-foreground">Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteSub.isPending}>
                {deleteSub.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
