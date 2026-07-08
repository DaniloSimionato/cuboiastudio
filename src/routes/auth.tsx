import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar · Cubo AI Studio" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // login fields
  const [lEmail, setLEmail] = useState("");
  const [lPass, setLPass] = useState("");
  // register fields
  const [rNome, setRNome] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rEmpresa, setREmpresa] = useState("");
  const [rPass, setRPass] = useState("");
  const [rPass2, setRPass2] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/portal" });
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(lEmail.trim(), lPass);
    setLoading(false);
    if (!res.ok) setError(res.error ?? "Falha ao entrar.");
    else navigate({ to: "/portal" });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (rPass.length < 6) return setError("A senha deve ter pelo menos 6 caracteres.");
    if (rPass !== rPass2) return setError("As senhas não coincidem.");
    setLoading(true);
    const res = await register({
      nome: rNome.trim(),
      email: rEmail.trim(),
      empresa: rEmpresa.trim() || undefined,
      password: rPass,
    });
    setLoading(false);
    if (!res.ok) setError(res.error ?? "Falha ao criar conta.");
    else navigate({ to: "/portal" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold">Cubo AI Studio</div>
            <div className="text-xs opacity-80">Agentes seguros</div>
          </div>
        </div>
        <div className="space-y-3 max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Construa agentes de IA prontos para atendimento multicanal.
          </h1>
          <p className="opacity-90 text-sm">
            Crie, teste e publique agentes integrados ao Cubo.Chat com segurança ponta-a-ponta.
          </p>
        </div>
        <div className="text-xs opacity-70">© Cubo.Chat — todos os direitos reservados.</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>Acesse sua conta ou crie uma nova para começar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v === "register" ? "register" : "login");
                setError(null);
              }}
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Criar conta</TabsTrigger>
              </TabsList>

              {error && (
                <div className="mt-4 flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}

              <TabsContent value="login" className="space-y-3 mt-4">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lemail">Email</Label>
                    <Input
                      id="lemail"
                      type="email"
                      required
                      value={lEmail}
                      onChange={(e) => setLEmail(e.target.value)}
                      placeholder="voce@empresa.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lpass">Senha</Label>
                    <Input
                      id="lpass"
                      type="password"
                      required
                      value={lPass}
                      onChange={(e) => setLPass(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Não tem conta?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setTab("register")}
                    >
                      Criar agora
                    </button>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-3 mt-4">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rnome">Nome completo</Label>
                    <Input
                      id="rnome"
                      required
                      value={rNome}
                      onChange={(e) => setRNome(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="remail">Email</Label>
                    <Input
                      id="remail"
                      type="email"
                      required
                      value={rEmail}
                      onChange={(e) => setREmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rempresa">Empresa (opcional)</Label>
                    <Input
                      id="rempresa"
                      value={rEmpresa}
                      onChange={(e) => setREmpresa(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="rpass">Senha</Label>
                      <Input
                        id="rpass"
                        type="password"
                        required
                        value={rPass}
                        onChange={(e) => setRPass(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="rpass2">Confirmar</Label>
                      <Input
                        id="rpass2"
                        type="password"
                        required
                        value={rPass2}
                        onChange={(e) => setRPass2(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Criar conta
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Cadastro mockado no frontend. A produção usará Lovable Cloud com sessões
                    seguras.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
