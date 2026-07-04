import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SidebarProvider } from "@/lib/sidebar-context";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/auth" });
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      document.body.style.overflow = "hidden";
      document.body.style.height = "100vh";
      return () => {
        document.body.style.overflow = "";
        document.body.style.height = "";
      };
    }
  }, [isAuthenticated]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen overflow-hidden flex bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Topbar />
          <main className="flex-1 min-h-0 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
