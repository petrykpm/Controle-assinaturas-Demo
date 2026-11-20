import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-muted-foreground">Página não encontrada</p>
        <a href="/" className="text-primary underline hover:text-primary/80 text-sm">
          Voltar ao início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
