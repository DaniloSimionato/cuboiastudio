import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { PrismaService } from "../database/prisma.service";
import { AssistantKnowledgeService } from "../assistant-knowledge/assistant-knowledge.service";

const ASSISTANT_ID = "cmrcunljc008rrq01d7urn2t5";
const COMPANY_ID = "cmrcu4hdl008yrq01noholvvd";

const newKnowledgeItems = [
  {
    title: "FG - Formatação, Sistemas, Placa-Mãe e Vírus",
    content: `FORMATAÇÃO, SISTEMAS E REMOÇÃO DE VÍRUS

A FG Informática realiza serviços de software em computadores desktop, notebooks e All in One:
- Formatação básica padrão (com Windows, Microsoft Office básico/leitor PDF, antivírus e navegadores): A referência de valor é a partir de R$ 195,00.
- Mudança de sistema (Linux para Windows) ou configuração de Dual Boot.
- Instalação de programas adicionais e backup de arquivos (verificado conforme a integridade do HD/SSD do cliente).
- Remoção de vírus, malware, adware, lentidão e otimização do sistema.

Importante: softwares pagos dependem da licença fornecida pelo cliente ou da aquisição de licença válida.

REPARO DE PLACA-MÃE (NOTEBOOK E DESKTOP)
- Atendemos defeitos como: equipamento não liga, liga sem dar vídeo, curtos-circuitos, problemas em portas USB/Áudio/Conectores.
- Valor de referência inicial para reparo de placa-mãe: A partir de R$ 395,00.

Diretrizes para a IA:
1. Sempre informe o preço de referência inicial (ex: "a partir de R$ 195,00 para formatação" ou "a partir de R$ 395,00 para reparo de placa-mãe").
2. Sempre ressalte que o valor final e o prazo exato dependem do diagnóstico técnico presencial no laboratório.
3. Não garanta a recuperação de arquivos ou viabilidade de reparo em placa-mãe sem antes passar pela avaliação dos técnicos.`
  },
  {
    title: "FG - Serviços de Notebook e Upgrades",
    content: `SERVIÇOS DE NOTEBOOK E UPGRADES

A FG Informática realiza manutenções físicas e upgrades em notebooks de todas as marcas:

1. Troca de Tela:
   - Telas novas a partir de R$ 599,90. Temos também opções de telas seminovas sob consulta.
   - Prazo: concluído no mesmo dia se houver estoque.
2. Troca de Bateria:
   - Baterias de notebook a partir de R$ 395,00.
3. Troca de Teclado:
   - Teclados de notebook a partir de R$ 295,00.
4. Fonte / Carregador de Notebook:
   - Fontes de notebook a partir de R$ 150,00.
5. Reparo de Dobradiça e Carcaça:
   - Reparos de carcaça e dobradiças quebradas a partir de R$ 295,00.
6. Upgrades de Velocidade:
   - Upgrade de HD para SSD (Sata ou M.2 NVMe) e expansão de memória RAM. Orçamento sob consulta técnica de compatibilidade.

Diretrizes para a IA:
1. Informe os preços de referência inicial de forma clara e objetiva.
2. Explique que o notebook precisa ser trazido à loja para que a equipe técnica confirme a compatibilidade física exata dos componentes.
3. Oriente o cliente a trazer o carregador antigo quando for comprar uma fonte nova para garantir a voltagem correta.`
  },
  {
    title: "FG - Coleta, Entrega e Formas de Pagamento",
    content: `COLETA, ENTREGA E FORMAS DE PAGAMENTO

Serviço de Busca e Entrega (Leva e Traz):
- Gratuito dentro do perímetro urbano da cidade de Dourados/MS.
- Realizado mediante agendamento prévio e disponibilidade do entregador.

Formas de Pagamento:
- Dinheiro, PIX, Cartão de Débito, Cartão de Crédito e Boleto Bancário.
- Parcelamento disponível no cartão. Boleto bancário e parcelamento estendido estão sujeitos a análise e aprovação pelo setor financeiro da empresa.

Diretrizes para a IA:
1. Ofereça a coleta gratuita proativamente sempre que o cliente disser que tem dificuldades para trazer o equipamento até a loja.
2. Para agendar a coleta, solicite: Endereço completo, Nome do responsável, WhatsApp, Tipo de equipamento e Breve descrição do problema.`
  },
  {
    title: "FG - Garantia dos Serviços",
    content: `GARANTIA DA ASSISTÊNCIA TÉCNICA

- Todos os serviços efetuados pela FG Informática possuem garantia legal de 3 meses (90 dias) a partir da data de entrega do equipamento.
- A garantia é do tipo Balcão (o cliente deve trazer o equipamento até a assistência técnica para ser avaliado).
- A garantia cobre estritamente o serviço realizado e as peças que foram trocadas.
- Não cobre: mau uso, quedas, contato com líquidos (oxidação), surtos de energia ou intervenções feitas por terceiros.

Diretrizes para a IA:
1. Nunca aprove ou garanta cobertura de garantia imediatamente no chat.
2. Explique de forma amigável que a equipe precisa avaliar o aparelho fisicamente no balcão para certificar a origem do problema.`
  },
  {
    title: "FG - Impressoras, Cupom, Etiquetas e Garantia de Impressoras",
    content: `MANUTENÇÃO E REPARO DE IMPRESSORAS

A FG realiza manutenção preventiva e corretiva em impressoras domésticas, empresariais e industriais:
- Impressoras jato de tinta, laser, HP, Epson (Ecotank), etc.
- Impressoras térmicas de cupom (não-fiscal) e etiquetas (Bematech MP-4200, Zebra, etc.).
- Não realizamos manutenção em impressoras fiscais (ECF).
- Valor de referência inicial: A partir de R$ 395,00.

Suprimentos e Almofadas (Epson):
- Tintas, toners, cilindros e almofadas de descarte de tinta são considerados consumíveis e não possuem cobertura de garantia após desgaste natural.
- A mensagem de "Almofadas de tinta da impressora estão no fim da sua vida útil" necessita de manutenção técnica (limpeza/troca das almofadas e reset de contador).

Diretrizes para a IA:
1. Informar que a manutenção de impressoras custa a partir de R$ 395,00.
2. Se o cliente disser que a impressora é fiscal, responda educadamente que não trabalhamos com esse tipo.
3. Se o cliente relatar falhas de impressão, pergunte a marca/modelo e há quanto tempo o equipamento está parado.`
  },
  {
    title: "FG - Relógio Ponto e Software de Controle de Ponto",
    content: `RELÓGIO PONTO E SOFTWARE DE CONTROLE DE PONTO

Soluções ControliD e Secullum (Banco de horas, relatórios de ponto, etc.).

PASSO 1: Identificar a necessidade do cliente perguntando:
"Você já é nosso cliente de Relógio Ponto / Software e precisa de suporte, ou gostaria de solicitar um orçamento para adquirir uma nova solução?"

Fluxo 1 — Novos Clientes (Desejam Adquirir):
Colete obrigatoriamente:
- Cidade da instalação;
- Quantos CNPJs/empresas serão atendidos;
- Quantidade aproximada de funcionários.
Diga: "Perfeito! Vou encaminhar estas informações ao Técnico Douglas, que irá preparar um orçamento personalizado para a sua empresa."

Fluxo 2 — Clientes Atuais (Suporte Técnico):
Colete:
- CNPJ da empresa;
- Detalhes do problema ou dúvida.
Diga: "Entendido! Encaminhei sua solicitação ao Douglas. Por favor, você também pode falar diretamente com ele pelo WhatsApp de suporte de Ponto: (67) 98401-4070."

Diretrizes para a IA:
1. Nunca passe preços de relógios de ponto ou mensalidades de software. O Técnico Douglas cuida de toda a negociação.`
  },
  {
    title: "FG - Visita Técnica Externa, Redes e Wi-Fi",
    content: `VISITA TÉCNICA EXTERNA E REDES

- Realizamos atendimento no local para residências e empresas (infraestrutura de rede, Wi-Fi lento, configuração de roteadores, cabeamento de rede, etc.).
- Valor da Visita Técnica: A partir de R$ 250,00 (cobre o deslocamento e avaliação inicial do técnico).
- Dependendo da complexidade ou necessidade de cabos/roteadores adicionais, o técnico passará o orçamento complementar no local.

Diretrizes para a IA:
1. Se o cliente solicitar a presença de um técnico no local, informe que a visita custa a partir de R$ 250,00.
2. Para agendar a visita, solicite: Endereço completo, Nome do responsável, Celular/WhatsApp de contato e Qual problema/serviço precisa de solução.`
  },
  {
    title: "FG - Nobreaks, Projetores e Eletrônicos Diversos",
    content: `NOBREAKS, PROJETORES E OUTROS ELETRÔNICOS

Manutenção especializada em eletrônicos:
- Nobreaks (troca de baterias e reparo eletrônico em placa): Orçamento sob diagnóstico.
- Projetores (limpeza óptica, troca de lâmpada, correção de cores/pontos na imagem): Referência a partir de R$ 395,00.
- Outros eletrônicos (fragmentadoras de papel, plastificadoras, caixas de som JBL, repetidores Wi-Fi, tablets, leitores de código de barras): Mediante avaliação técnica.

Diretrizes para a IA:
1. Informar que realizamos a manutenção desses aparelhos e que a avaliação física inicial é indispensável para identificar se há peças compatíveis e a viabilidade do reparo.
2. Para projetores, utilize a referência inicial de R$ 395,00.`
  },
  {
    title: "FG - MacBook, iMac, Videogames, Monitores e TVs",
    content: `LINHA APPLE, VIDEOGAMES, MONITORES E TVS

1. MacBook e iMac:
   - Serviços de formatação/reinstalação de macOS, limpeza interna com troca de pasta térmica, upgrade de SSD/RAM e reparos de placa-mãe.
   - Orçamento sob diagnóstico.
2. Videogames e Controles:
   - Limpeza e troca de pasta térmica em PlayStation (PS3, PS4, PS5) e Xbox, reparos em Nintendo Switch e conserto de manetes/controles (drift de analógico, botões falhando).
   - Orçamento sob diagnóstico.
3. Monitores e Televisores:
   - Reparos em placas e fontes de monitores e TVs de diversas marcas.
   - Orçamento sob diagnóstico.

Diretrizes para a IA:
1. Explique que esses aparelhos exigem componentes específicos, por isso os valores e prazos são passados logo após o diagnóstico em nosso laboratório.`
  },
  {
    title: "FG - Recuperação de Dados e Montagem de Computadores",
    content: `RECUPERAÇÃO DE DADOS E MONTAGEM DE COMPUTADORES

1. Recuperação de Dados:
   - Tentativa de recuperação de arquivos deletados ou corrompidos em HDs, SSDs, Pendrives e Cartões de Memória.
   - O diagnóstico inicial determina a viabilidade (danos lógicos ou físicos).
   - Importante: Oriente o cliente a parar de usar o dispositivo imediatamente após a perda de dados para não sobrescrever os arquivos antigos.
   - Orçamento sob diagnóstico.

2. Montagem e Configuração de Computadores:
   - Montagem completa de PC Gamer, PCs corporativos sob medida e configuração inicial de computadores e notebooks novos.
   - Valor inicial: A partir de R$ 195,00.

Diretrizes para a IA:
1. Nunca garanta 100% de recuperação de dados.
2. Informar o valor inicial de R$ 195,00 para a montagem e configuração de máquinas novas.`
  },
  {
    title: "FG - Vendas, Comercial e Equipamentos Seminovos",
    content: `CONTATOS DO SETOR DE VENDAS (MÓVEIS E TI)

Se o cliente deseja comprar computadores novos, notebooks, impressoras, móveis corporativos, cadeiras de escritório, toners ou cartuchos novos, passe o contato do nosso setor de vendas comercial:

- Leandro (Informática e Móveis): (67) 99972-0727
- Renata (Informática e Móveis): (67) 99689-6557
- Laís (Informática e Móveis): (67) 99229-8130
- Weslley (FG Office - Móveis Escritório): (67) 99677-7648
- Telefone Fixo da Loja: (67) 3411-7070

Venda de Equipamentos Seminovos:
- Vendemos notebooks, desktops e impressoras seminovos.
- Todos são revisados por nossa assistência técnica, testados e contam com garantia própria de funcionamento.
- Consulte a disponibilidade do estoque de seminovos no dia do atendimento.`
  },
  {
    title: "FG - Objeção de Preço e Custo-benefício do Reparo",
    content: `CONTORNO DE OBJEÇÕES E EMPATIA

Caso o cliente sinta que o orçamento do reparo ficou acima do esperado ou mencione que "não sabe se vale a pena consertar", a IA deve acolher o sentimento de forma extremamente empática:

Diga frases acolhedoras como:
- "Entendo perfeitamente o seu ponto, consertos nem sempre são gastos esperados."
- "Compreendo a sua preocupação. O ideal é colocarmos na balança o custo-benefício."

Argumentos positivos para o reparo:
1. Economia: o conserto geralmente é muito mais barato do que comprar um equipamento novo de mesma configuração.
2. Garantia de 3 meses no serviço executado e peças trocadas.
3. Possibilidade de parcelamento no cartão de crédito.
4. Preservação do equipamento que já atende perfeitamente as necessidades do cliente.

Se mesmo assim o cliente preferir não fazer o serviço, seja cordial e coloque a FG à disposição para futuras necessidades.`
  }
];

async function main() {
  console.log("🚀 Starting knowledge base replacement script...");
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
  const prisma = app.get(PrismaService);
  const knowledgeService = app.get(AssistantKnowledgeService);

  try {
    // 1. Delete all old knowledge chunks and records
    console.log("🧹 Cleaning up old knowledge items and chunks...");
    const oldItems = await prisma.assistantKnowledge.findMany({
      where: {
        assistantId: ASSISTANT_ID,
        companyId: COMPANY_ID,
      },
      select: { id: true },
    });

    for (const item of oldItems) {
      await prisma.assistantKnowledgeChunk.deleteMany({
        where: { knowledgeId: item.id },
      });
    }

    await prisma.assistantKnowledge.deleteMany({
      where: {
        assistantId: ASSISTANT_ID,
        companyId: COMPANY_ID,
      },
    });
    console.log(`✅ Deleted ${oldItems.length} old knowledge items.`);

    // 2. Insert new knowledge items and prepare them
    const mockUser = { id: "system-reset", companyId: COMPANY_ID } as any;
    const mockTenant = { companyId: COMPANY_ID } as any;

    console.log("📥 Inserting and preparing new knowledge items...");
    for (const item of newKnowledgeItems) {
      console.log(`   - Creating: "${item.title}"`);
      const created = await prisma.assistantKnowledge.create({
        data: {
          assistantId: ASSISTANT_ID,
          companyId: COMPANY_ID,
          title: item.title,
          content: item.content,
          status: "ACTIVE",
          processingStatus: "PENDING",
        },
      });

      console.log(`   - Vectorizing: "${item.title}"`);
      await knowledgeService.prepare({
        assistantId: ASSISTANT_ID,
        knowledgeId: created.id,
        user: mockUser,
        tenant: mockTenant,
      });
      console.log(`   - Done: "${item.title}"`);
    }

    console.log("🎉 All knowledge base items updated and vectorized successfully!");
  } catch (error) {
    console.error("❌ Error running script:", error);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
