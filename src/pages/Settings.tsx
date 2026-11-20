import { AppLayout } from '@/components/AppLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, X, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCategories, useCreateCategory, useDeleteCategory,
  useUserSettings, useUpdateUserSettings,
} from '@/hooks/useSupabase';

const CURRENCIES = [
  { value: 'BRL', label: 'Real (R$)', symbol: 'R$' },
  { value: 'USD', label: 'Dólar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
];

export default function SettingsPage() {
  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const { data: settings, isLoading: loadingSettings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const qc = useQueryClient();

  const [newCat, setNewCat] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('BRL');

  // Password change state

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || '');
      setCurrency(settings.currency || 'BRL');
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync({ company_name: companyName.trim(), currency });
      toast.success('Configurações salvas');
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      toast.error(`Erro ao salvar: ${err?.message || 'Tente novamente'}`);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Categoria já existe');
      return;
    }
    try {
      await createCategory.mutateAsync({ name: trimmed, color: newCatColor });
      setNewCat('');
      setNewCatColor('#3b82f6');
      toast.success('Categoria adicionada');
    } catch {
      toast.error('Erro ao adicionar');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      toast.success('Categoria removida');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  if (loadingCats || loadingSettings) {
    return <AppLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Preferências e dados da organização</p>
        </div>

        {/* Dados da empresa */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Dados da Empresa</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Nome da empresa</Label>
              <Input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Ex: Minha Empresa"
                className="mt-1 bg-surface-2 border-border"
                maxLength={100}
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Moeda de exibição</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1 bg-surface-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Os valores são armazenados em BRL e convertidos automaticamente conforme a cotação atual.
          </p>
          <Button
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
            className="gradient-primary text-primary-foreground border-0"
          >
            {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>

        {/* Categorias */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Categorias</h3>
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhuma categoria cadastrada. Adicione abaixo.</p>
            )}
            {categories.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1 text-xs text-foreground">
                <label className="relative cursor-pointer" title="Clique para mudar a cor">
                  <span className="h-2.5 w-2.5 rounded-full block border border-white/20" style={{ backgroundColor: c.color }} />
                  <input
                    type="color"
                    defaultValue={c.color}
                    onChange={async e => {
                      try {
                        const { error } = await supabase
                          .from('categories').update({ color: e.target.value }).eq('id', c.id);
                        if (!error) {
                          qc.invalidateQueries({ queryKey: ['categories'] });
                          toast.success('Cor atualizada');
                        }
                      } catch {}
                    }}
                    className="sr-only"
                  />
                </label>
                {c.name}
                <button
                  onClick={() => handleDeleteCategory(c.id)}
                  className="ml-0.5 hover:text-destructive transition-colors"
                  title="Remover categoria"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <form autoComplete="off" onSubmit={e => { e.preventDefault(); handleAddCategory(); }} className="flex gap-2 items-center">
            <div className="relative">
              <input
                type="color"
                value={newCatColor}
                onChange={e => setNewCatColor(e.target.value)}
                className="h-9 w-9 rounded-md border border-border cursor-pointer bg-surface-2 p-0.5"
                title="Escolher cor"
              />
            </div>
            <input
              type="text"
              placeholder="Nova categoria"
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              className="flex h-9 w-full max-w-xs rounded-md border border-border bg-surface-2 px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              maxLength={30}
              autoComplete="off"
              name="new-category-field"
            />
            <Button
              type="submit"
              variant="outline"
              className="border-border text-muted-foreground"
              disabled={createCategory.isPending}
            >
              {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </form>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Conta demonstrativa</h3>
          </div>
          <p className="text-sm text-muted-foreground">A autenticação desta versão é simulada. A senha não pode ser alterada e não existe uma conta real associada a este acesso.</p>
        </div>


      </div>
    </AppLayout>
  );
}





