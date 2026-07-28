import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { PrismaService } from "../database/prisma.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);

  try {
    const logs = await prisma.assistantRuntimeLog.findMany({
      where: { assistantId: "cmrcunljc008rrq01d7urn2t5" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (logs.length > 0) {
      console.log("Metadata of latest log:");
      console.log(JSON.stringify(logs[0].metadata, null, 2));
    } else {
      console.log("No logs found");
    }
  } catch (error) {
    console.error(error);
  } finally {
    await app.close();
  }
}

main().catch(console.error);
