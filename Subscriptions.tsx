import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { SubscriptionIcon } from '@/components/SubscriptionIcon';
import {
  useSubscriptions, useCreateSubscription, useUpdateSubscription, useDeleteSubscription,
  useCategories, formatCurrency,
  type SubscriptionStatus, type BillingType,
} from '@/hooks/useSupabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, Pencil, Trash2, ArrowUpDown, Loader2 } from 'lucide-react';
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

const emptyForm = {
  name: '', category: 'SaaS', value: 0, billing_type: 'monthly' as BillingType,
  renewal_date: '', status: 'active' as SubscriptionStatus, responsible: '', notes: '', url: '',
};

type SortKey = 'name' | 'value' | 'renewal_date' | 'category';

export default function SubscriptionsPage() {
  const { data: subs = [], isLoading } = useSubscriptions();
  const { data: categories = [] } = useCategories();
  const createSub = useCreateSubscription();
  const updateSub = useUpdateSubscription();
  const deleteSub = useDeleteSubscription();

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);

  const categoryNames = categories.map(c => c.name);

  const filtered = useMemo(() => {
    let result = subs.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    if (filterCat !== 'all') result = result.filter(s => s.category === filterCat);
    if (filterStatus !== 'all') result = result.filter(s => s.status === filterStatus);
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'value') cmp = a.value - b.value;
      else if (sortKey === 'renewal_date') cmp = new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime();
      else cmp = (a[sortKey] as string).localeCompare(b[sortKey] as string);
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [subs, search, filterCat, filterStatus, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.value || form.value <= 0 || !form.renewal_date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    const sanitized = { ...form, name: form.name.trim(), responsible: form.responsible.trim(), notes: form.notes.trim(), url: form.url.trim() };
    try {
      if (editingId) {
        await updateSub.mutateAsync({ id: editingId, ...sanitized });
        toast.success('Assinatura atualizada');
      } else {
        await createSub.mutateAsync(sanitized);
        toast.success('Assinatura adicionada');
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err: any) {
      console.error('Erro completo:', err);
      toast.error(`Erro: ${err?.message || JSON.stringify(err)}`);
    }
  };

  const handleEdit = (sub: typeof subs[0]) => {
    setForm({
      name: sub.name, category: sub.category, value: sub.value,
      billing_type: sub.billing_type, renewal_date: sub.renewal_date,
      status: sub.status, responsible: sub.responsible, notes: sub.notes, url: sub.url ?? '',
    });
    setEditingId(sub.id);
    setShowForm(true);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Assinaturas</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie todas as assinaturas e serviços</p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="gap-1.5 gradient-primary text-primary-foreground border-0">
            <Plus className="h-4 w-4" /> Nova assinatura
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-surface-2 border-border" />
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
        </div>

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
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => (
                  <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2"><SubscriptionIcon url={sub.url} name={sub.name} size="md" /><p className="text-sm font-medium text-foreground">{sub.name}</p></div>
                      <p className="text-xs text-muted-foreground">{sub.responsible}</p>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs text-muted-foreground bg-surface-3 rounded px-2 py-0.5">{sub.category}</span></td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground tabular-nums">{formatCurrency(sub.value)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{billingTypes.find(b => b.value === sub.billing_type)?.label}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(sub.renewal_date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(sub)} className="p-1.5 rounded hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteDialog(sub.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Nenhuma assinatura encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editingId ? 'Editar' : 'Nova'} Assinatura</DialogTitle>
              <DialogDescription className="text-muted-foreground">Preencha os dados do serviço</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs">Nome do serviço *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 bg-surface-2 border-border" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Categoria *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1 bg-surface-2 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{categoryNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Valor (R$) *</Label>
                <Input type="number" min="0" step="0.01" value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))} className="mt-1 bg-surface-2 border-border" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Tipo de cobrança</Label>
                <Select value={form.billing_type} onValueChange={v => setForm(f => ({ ...f, billing_type: v as BillingType }))}>
                  <SelectTrigger className="mt-1 bg-surface-2 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{billingTypes.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Data de renovação *</Label>
                <Input type="date" value={form.renewal_date} onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))} className="mt-1 bg-surface-2 border-border" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as SubscriptionStatus }))}>
                  <SelectTrigger className="mt-1 bg-surface-2 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Responsável</Label>
                <Input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} className="mt-1 bg-surface-2 border-border" />
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs">Site do serviço (para buscar o ícone)</Label>
                <Input type="url" placeholder="https://exemplo.com" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="mt-1 bg-surface-2 border-border" />
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
