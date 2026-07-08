import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Moon, Sun, LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

export function Topbar() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = useMemo(
    () =>
      (user?.nome || "OP")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [user?.nome],
  );

  return (
    <header className="h-16 border-b bg-card flex items-center gap-3 px-6">
      <div className="flex-1" />

      <Button
        variant="outline"
        size="icon"
        onClick={toggle}
        aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <Button asChild className="gap-2">
        <Link to="/agentes/novo">
          <Plus className="h-4 w-4" />
          Novo Agente
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="text-sm">{user?.nome ?? "Operador"}</span>
            <span className="text-xs font-normal text-muted-foreground truncate">
              {user?.email ?? ""}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/configuracoes" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Minha conta
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              logout();
              if (user?.id?.startsWith("stg-usr-")) {
                window.location.href = "/staging/logout";
              } else {
                navigate({ to: "/auth" });
              }
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
