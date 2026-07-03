import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { variaveis } from "@/data/mock";

export const Route = createFileRoute("/_app/variaveis")({
  head: () => ({ meta: [{ title: "Variáveis · Cubo AI Studio" }] }),
  component: VarsPage,
});

function VarsPage() {
  return (
    <div>
      <PageHeader
        title="Variáveis"
        description="Variáveis disponíveis para uso em prompts, ferramentas e fluxos."
        actions={
          <Button>
            <Plus className="h-4 w-4" /> Nova variável
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Exemplo</TableHead>
                <TableHead>Disponível em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variaveis.map((v) => (
                <TableRow key={v.nome}>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{v.nome}</code>
                  </TableCell>
                  <TableCell>{v.descricao}</TableCell>
                  <TableCell className="text-muted-foreground">{v.origem}</TableCell>
                  <TableCell className="font-mono text-xs">{v.exemplo}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {v.disponivelEm.map((d) => (
                        <Badge key={d} variant="outline">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
