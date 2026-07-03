import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Bot,
  FileUp,
  Wrench,
  GitBranch,
  PlayCircle,
  Send,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/implantacao")({
  head: () => ({ meta: [{ title: "Assistente de Implantação · Cubo AI Studio" }] }),
  component: ImplantacaoPage,
});

const steps = [
  { id: 1, label: "Dados da empresa", icon: Building2 },
  { id: 2, label: "Criar Assistente", icon: Bot },
  { id: 3, label: "Enviar documentos", icon: FileUp },
  { id: 4, label: "Configurar Ferramentas", icon: Wrench },
  { id: 5, label: "Configurar Fluxo", icon: GitBranch },
  { id: 6, label: "Testar", icon: PlayCircle },
  { id: 7, label: "Publicar", icon: Send },
];

function ImplantacaoPage() {
  const [step, setStep] = useState(1);
  const current = steps.find((s) => s.id === step)!;
  const Icon = current.icon;

  return (
    <div>
      <PageHeader
        title="Assistente de Implantação"
        description="Wizard guiado para colocar um novo Assistente IA em produção no Cubo.Chat."
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {steps.map((s, idx) => {
              const SIcon = s.icon;
              const done = s.id < step;
              const active = s.id === step;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setStep(s.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors",
                      active && "bg-primary text-primary-foreground font-medium",
                      done && !active && "text-primary",
                      !active && !done && "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full grid place-items-center border text-[10px] font-bold",
                        active && "border-primary-foreground",
                        done && "border-primary bg-primary/10",
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <SIcon className="h-3 w-3" />
                      )}
                    </div>
                    <span>{s.label}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" /> Etapa {step} · {current.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}
          {step === 5 && <Step5 />}
          {step === 6 && <Step6 />}
          {step === 7 && <Step7 />}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            {step < steps.length ? (
              <Button onClick={() => setStep(step + 1)}>
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button>
                <Send className="h-4 w-4" /> Publicar Assistente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Step1() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome da empresa">
        <Input placeholder="Ex.: Farmácia São Lucas" />
      </Field>
      <Field label="Segmento">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="comercio">Comércio / Varejo</SelectItem>
            <SelectItem value="saude">Saúde</SelectItem>
            <SelectItem value="servicos">Serviços</SelectItem>
            <SelectItem value="financeiro">Financeiro</SelectItem>
            <SelectItem value="tecnologia">Tecnologia</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Site / URL">
        <Input placeholder="https://" />
      </Field>
      <Field label="Horário de atendimento">
        <Input placeholder="Seg–Sex 08h–18h" />
      </Field>
      <div className="md:col-span-2">
        <Field label="Sobre a empresa">
          <Textarea
            rows={3}
            placeholder="Breve descrição do negócio, público-alvo e diferenciais..."
          />
        </Field>
      </div>
    </div>
  );
}

function Step2() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Nome do Assistente">
        <Input placeholder="Ex.: Atendente Comercial" />
      </Field>
      <Field label="Persona">
        <Select defaultValue="cordial">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cordial">Cordial e empático</SelectItem>
            <SelectItem value="objetivo">Objetivo e direto</SelectItem>
            <SelectItem value="tecnico">Técnico e formal</SelectItem>
            <SelectItem value="descontraido">Descontraído</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Modelo">
        <Select defaultValue="gpt-4o-mini">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
            <SelectItem value="gpt-4o">gpt-4o</SelectItem>
            <SelectItem value="claude-3-5-sonnet">claude-3-5-sonnet</SelectItem>
            <SelectItem value="gemini-1.5-pro">gemini-1.5-pro</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Idioma">
        <Select defaultValue="pt-BR">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pt-BR">Português (BR)</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Objetivo principal">
          <Textarea
            rows={3}
            placeholder="O que esse Assistente deve resolver para o cliente final?"
          />
        </Field>
      </div>
    </div>
  );
}

function Step3() {
  return (
    <div>
      <div className="border-2 border-dashed rounded-lg p-8 grid place-items-center text-center text-sm">
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <div className="font-medium">Arraste documentos aqui</div>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOCX, TXT, planilhas e FAQs · até 25 MB cada
        </p>
        <Button variant="outline" size="sm" className="mt-3">
          Selecionar arquivos
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-xs">
        {[
          { n: "catalogo_produtos.xlsx", s: "1,2 MB" },
          { n: "politica_trocas.pdf", s: "240 KB" },
          { n: "faq_atendimento.docx", s: "88 KB" },
        ].map((f) => (
          <div key={f.n} className="flex items-center justify-between p-2.5 border rounded-md">
            <span className="truncate">{f.n}</span>
            <span className="text-muted-foreground">{f.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step4() {
  const tools = [
    { n: "Consultar pedido", t: "API REST" },
    { n: "Criar OS", t: "Webhook" },
    { n: "Transferir humano", t: "Cubo.Chat action" },
    { n: "Adicionar tag", t: "Cubo.Chat action" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Habilite as ferramentas que o Assistente poderá utilizar. Credenciais serão configuradas no
        backend.
      </p>
      {tools.map((t, i) => (
        <div key={t.n} className="flex items-center justify-between p-3 border rounded-md">
          <div>
            <div className="text-sm font-medium">{t.n}</div>
            <div className="text-[11px] text-muted-foreground">{t.t}</div>
          </div>
          <Switch defaultChecked={i < 2} />
        </div>
      ))}
    </div>
  );
}

function Step5() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Selecione um modelo de fluxo. Você poderá ajustá-lo no Flow Builder após a publicação.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { n: "Atendimento padrão", d: "Recebe → Decisão IA → Assistente → Resposta" },
          {
            n: "Suporte com triagem",
            d: "Decisão IA → Conhecimento → Assistente → Transferir humano",
          },
          { n: "Comercial qualificador", d: "Assistente → Ferramenta CRM → Tag → Encerrar" },
        ].map((f, i) => (
          <button
            key={f.n}
            className={cn(
              "text-left p-3 border rounded-lg hover:border-primary transition-colors",
              i === 0 && "border-primary bg-primary/5",
            )}
          >
            <div className="text-sm font-medium">{f.n}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{f.d}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step6() {
  return (
    <div className="space-y-3">
      <div className="p-3 border rounded-md bg-muted/30 text-xs">
        Envie mensagens de teste para validar respostas, ferramentas e fallback antes de publicar.
      </div>
      <div className="border rounded-md p-3 h-48 overflow-y-auto space-y-2 text-xs">
        <div className="flex">
          <div className="bg-muted rounded-lg px-3 py-1.5 max-w-[70%]">
            Olá, quero a 2ª via do meu boleto.
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 max-w-[70%]">
            Claro! Pode me confirmar seu CPF para que eu localize?
          </div>
        </div>
        <div className="flex">
          <div className="bg-muted rounded-lg px-3 py-1.5 max-w-[70%]">123.456.789-00</div>
        </div>
        <div className="flex justify-end">
          <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 max-w-[70%]">
            Encontrei seu boleto. Enviei o link no chat. Posso ajudar em algo mais?
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Digite uma mensagem..." />
        <Button>Enviar</Button>
      </div>
    </div>
  );
}

function Step7() {
  return (
    <div className="space-y-3">
      <div className="p-4 border rounded-lg bg-emerald-500/5 border-emerald-500/30">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> Tudo pronto para publicação
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Após publicar, o Assistente ficará disponível nos canais selecionados no Cubo.Chat.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {[
          ["Empresa", "Farmácia São Lucas"],
          ["Assistente", "Atendente Comercial"],
          ["Modelo", "gpt-4o-mini"],
          ["Documentos", "3 arquivos · 1,5 MB"],
          ["Ferramentas ativas", "2"],
          ["Fluxo", "Atendimento padrão"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between p-2.5 border rounded-md">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
      <div>
        <Label className="text-xs">Canais para publicação</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {["WhatsApp Oficial", "Instagram", "Webchat", "Facebook", "Telegram", "E-mail"].map(
            (c, i) => (
              <label
                key={c}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md text-xs cursor-pointer hover:bg-accent"
              >
                <input type="checkbox" defaultChecked={i < 2} className="accent-primary" />
                {c}
              </label>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
