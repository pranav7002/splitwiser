import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Connecting wallet...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    // Redirect to landing page but save the attempted URL for later
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
