import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser, RequestTenant } from "../auth/auth.types";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { Tenant } from "../auth/tenant.decorator";
import { CompaniesService, type CompaniesListResponse, type CompanyResponse, type CurrentCompanyResponse } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { SetActiveCompanyDto } from "./dto/set-active-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@ApiTags("companies")
@Controller("companies")
@UseGuards(AuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: "List companies accessible to the authenticated user" })
  @ApiHeader({
    name: "x-dev-user-id",
    required: false,
    description: "DEV ONLY. Local authentication user id.",
  })
  @ApiOkResponse({ description: "Accessible companies for company selector and admin screen." })
  list(@CurrentUser() user: AuthenticatedUser): Promise<CompaniesListResponse> {
    return this.companiesService.listAccessibleCompanies({ user });
  }

  @Get("current")
  @ApiOperation({ summary: "Return the current active company context" })
  @ApiOkResponse({ description: "Current company and safe user identity." })
  getCurrentCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Tenant() tenant: RequestTenant,
  ): Promise<CurrentCompanyResponse> {
    return this.companiesService.getCurrentCompany({ user, tenant });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one accessible company by id" })
  @ApiOkResponse({ description: "Safe company detail without secrets." })
  getById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyResponse> {
    return this.companiesService.findOne({ id, user });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("companies:manage")
  @ApiOperation({ summary: "Create a new isolated company/tenant" })
  @ApiBody({ type: CreateCompanyDto })
  @ApiOkResponse({ description: "Created company ready for onboarding." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Only company admins can create a company." })
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyResponse> {
    return this.companiesService.create({ dto, user });
  }

  @Patch(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("companies:manage")
  @ApiOperation({ summary: "Update one accessible company" })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiOkResponse({ description: "Updated company." })
  @ApiUnauthorizedResponse({ description: "Authentication is required." })
  @ApiForbiddenResponse({ description: "Only company admins can update a company." })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CompanyResponse> {
    return this.companiesService.update({ id, dto, user });
  }

  @Post("active")
  @HttpCode(200)
  @ApiOperation({ summary: "Persist the active company for the authenticated user" })
  @ApiBody({ type: SetActiveCompanyDto })
  @ApiOkResponse({ description: "New current company context." })
  setActiveCompany(
    @Body() dto: SetActiveCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CurrentCompanyResponse> {
    return this.companiesService.setActiveCompany({ dto, user });
  }
}
