import { spawnSync } from "node:child_process";
import process from "node:process";

const SERVER_IP = "167.233.21.169";
const SERVER_DIR = "/var/www/cubo-ai-studio";

console.log(`🚀 Iniciando deploy no servidor ${SERVER_IP}...`);

const sshCommand = `
  cd ${SERVER_DIR} && 
  echo "📥 Baixando atualizações do GitHub..." &&
  git fetch origin && 
  git reset --hard origin/main && 
  echo "🏗️ Reconstruindo e reiniciando a API e Frontend..." &&
  docker compose -f docker-compose.staging.yml up -d --build api frontend
`;

const result = spawnSync("ssh", ["root@" + SERVER_IP, sshCommand], {
  stdio: "inherit",
  shell: false,
});

if (result.status === 0) {
  console.log("✅ Deploy concluído com sucesso!");
} else {
  console.error("❌ Falha no deploy. Verifique os erros acima.");
}

process.exit(result.status ?? 1);
