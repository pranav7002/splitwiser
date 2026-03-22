import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm w-full mx-auto space-y-6">
        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto text-muted-foreground/40 text-4xl font-bold">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Vault Not Found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The group vault you're looking for doesn't exist, has been deleted, or you don't have access to it.
          </p>
        </div>
        <div className="pt-4">
          <a 
            href="/dashboard" 
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
