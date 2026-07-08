import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar · Cubo AI Studio" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: "/portal", replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(34,197,94,0.10),transparent_30%)]" />
      <Card className="relative w-full max-w-sm border-white/10 bg-slate-900/85 text-white shadow-2xl backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 text-slate-950">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Cubo AI Studio</CardTitle>
            <CardDescription className="mt-1 text-slate-400">
              O acesso é reservado a usuários criados por um administrador do Studio.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            Não há cadastro público. Use seu e-mail e senha cadastrados no Portal do Studio.
          </div>
          <Button className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300" asChild>
            <a href="/staging/login">
              Ir para o login
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
