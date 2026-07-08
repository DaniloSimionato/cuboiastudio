import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Status } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { verifyPassword } from "./password";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async authenticateStudioUser(input: {
    email: string;
    password: string;
    proxySecret: string;
  }): Promise<{ id: string; email: string; name: string }> {
    this.assertProxySecret(input.proxySecret);

    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        status: true,
        deletedAt: true,
      },
    });

    const valid =
      user?.status === Status.ACTIVE &&
      user.deletedAt === null &&
      Boolean(user.passwordHash) &&
      (await verifyPassword(input.password, user.passwordHash ?? ""));

    if (!valid || !user) {
      throw new UnauthorizedException("E-mail ou senha inválidos, ou usuário inativo.");
    }

    return { id: user.id, email: user.email, name: user.name };
  }

  private assertProxySecret(provided: string): void {
    const expected = this.configService.get<string>("AUTH_PROXY_SHARED_SECRET")?.trim() ?? "";
    const providedBuffer = Buffer.from(provided.trim());
    const expectedBuffer = Buffer.from(expected);

    if (
      !expected ||
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException("Trusted auth proxy credentials are invalid.");
    }
  }
}
