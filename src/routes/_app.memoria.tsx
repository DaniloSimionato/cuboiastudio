import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Pencil, Trash2 } from "lucide-react";
import { memorias, clientes, clienteNome } from "@/data/mock";

export const Route = createFileRoute("/_app/memoria")({
  head: () => ({ meta: [{ title: "Memória · Cubo AI Studio" }] }),
  component: MemoriaPage,
});

function MemoriaPage() {
  return (
    <div>
      <PageHeader title="Memória" description="Memórias salvas por contato e suas configurações." />

      <Alert className="mb-4 border-amber-200 bg-amber-50">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Atenção ao tratar dados sensíveis</AlertTitle>
        <AlertDescription className="text-amber-800">
          A memória deve ser controlada. Não armazene dados sensíveis (documentos, senhas, cartão)
          sem autorização explícita do cliente.
        </AlertDescription>
      </Alert>

      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Cliente/empresa" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Contato" />
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wa">WhatsApp Oficial</SelectItem>
              <SelectItem value="ig">Instagram</SelectItem>
              <SelectItem value="web">Webchat</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pref">Preferência</SelectItem>
              <SelectItem value="op">Operacional</SelectItem>
              <SelectItem value="ct">Contato</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Informação</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Brain className="h-8 w-8 mx-auto mb-2 opacity-50 text-primary animate-pulse" />
                    <p className="font-semibold text-sm">Nenhuma memória cadastrada</p>
                    <p className="text-xs">As memórias dos contatos aparecerão aqui automaticamente.</p>
                  </TableCell>
                </TableRow>
              ) : (
                memorias.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.contato}</TableCell>
                    <TableCell className="font-mono text-xs">{m.telefone}</TableCell>
                    <TableCell>{clienteNome(m.clienteId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.tipo}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{m.info}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{m.criadoEm}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{m.expiraEm}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
