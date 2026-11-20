import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2 text-center text-xs text-foreground">
            <span className="font-semibold text-primary">MODO DEMO</span>
            <span>Dados fictícios. Alterações salvas somente neste navegador. Não use informações reais.</span>
          </div>
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
