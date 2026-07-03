import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Status } from "@prisma/client";
import { type AuthenticatedUser, type RequestTenant } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";

export type CurrentCompanyResponse = {
  company: {
    id: string;
    name: string;
    document: string | null;
    status: Status;
  };
  user: {
    id: string;
    email: string;
    name: string;
  };
};

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentCompany(input: {
    user: AuthenticatedUser;
    tenant: RequestTenant;
  }): Promise<CurrentCompanyResponse> {
    if (input.user.companyId !== input.tenant.companyId) {
      throw new ForbiddenException("Tenant context does not match the authenticated user.");
    }

    const company = await this.prisma.company.findFirst({
      where: {
        id: input.tenant.companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        document: true,
        status: true,
      },
    });

    if (!company) {
      throw new NotFoundException("Current company was not found.");
    }

    return {
      company,
      user: {
        id: input.user.id,
        email: input.user.email,
        name: input.user.name,
      },
    };
  }
}
