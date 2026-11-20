import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, FlaskConical } from 'lucide-react';

function sanitizeAuthError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) return 'Email ou senha incorretos';
  return 'Erro na autenticação. Tente novamente.';
}

export default function AuthPage() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('demo@subcontrol.com');
  const [password, setPassword] = useState('demo123');
  const [submitting, setSubmitting] = useState(false);
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Preencha todos os campos'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success('Acesso demonstrativo liberado!');
    } catch (err: any) {
      toast.error(sanitizeAuthError(err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gradient">SubControl</h1>
          <p className="text-sm text-muted-foreground mt-2">Acesse o ambiente de demonstração</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium"><FlaskConical className="h-4 w-4 text-primary" /> Credenciais demonstrativas</div>
          <p className="mt-2 text-xs text-muted-foreground">E-mail: <strong>demo@subcontrol.com</strong></p>
          <p className="text-xs text-muted-foreground">Senha: <strong>demo123</strong></p>
          <p className="mt-2 text-xs text-muted-foreground">Dados fictícios armazenados somente neste navegador.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div><Label className="text-muted-foreground text-xs">Email</Label><div className="relative mt-1"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-9 bg-surface-2 border-border" /></div></div>
          <div><Label className="text-muted-foreground text-xs">Senha</Label><div className="relative mt-1"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-9 bg-surface-2 border-border" /></div></div>
          <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground border-0 gap-2">{submitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <>Entrar <ArrowRight className="h-4 w-4" /></>}</Button>
        </form>
      </div>
    </div>
  );
}
