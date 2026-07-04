import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AppActionStatus,
  AppCredentialType,
  AppInstallationStatus,
  Prisma,
  Status,
  type AppCredential,
  type AppInstallation,
} from "@prisma/client";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { DEFAULT_CORS_ORIGIN } from "../../app.constants";
import { PrismaService } from "../../database/prisma.service";

const GOOGLE_CALENDAR_SLUG = "google_calendar";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

type FetchLike = typeof fetch;

type OAuthStatePayload = {
  companyId: string;
  userId: string | null;
  installationId: string;
  nonce: string;
  expiresAt: number;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleCalendarListResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    primary?: boolean;
  }>;
};

type EncryptedTokenPayload = {
  encryptedToken: string;
  iv: string;
  authTag: string;
};

type GoogleCredentialRecord = Pick<
  AppCredential,
  | "id"
  | "companyId"
  | "installationId"
  | "providerAccountEmail"
  | "encryptedAccessToken"
  | "accessTokenIv"
  | "accessTokenAuthTag"
  | "encryptedRefreshToken"
  | "refreshTokenIv"
  | "refreshTokenAuthTag"
  | "scopes"
  | "expiresAt"
  | "status"
  | "connectedAt"
  | "lastRefreshAt"
  | "metadata"
  | "createdAt"
  | "updatedAt"
>;

export type GoogleCalendarOAuthStatus = {
  connected: boolean;
  providerAccountEmail: string | null;
  scopes: string[];
  connectedAt: Date | null;
  expiresAt: Date | null;
  lastRefreshAt: Date | null;
};

export type GoogleAuthorizedCredential = {
  installationId: string;
  appId: string;
  credentialId: string;
  accessToken: string;
  scopes: string[];
  expiresAt: Date | null;
};

@Injectable()
export class GoogleCalendarOAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject("GOOGLE_CALENDAR_FETCH")
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async buildAuthorizationUrl(input: {
    companyId: string;
    userId: string | null;
    installationId?: string;
  }): Promise<string> {
    const config = this.getRequiredOAuthConfig();
    const installation = await this.ensureGoogleCalendarInstallation(input.companyId, input.userId, input.installationId);
    const state = this.signState({
      companyId: input.companyId,
      userId: input.userId,
      installationId: installation.id,
      nonce: randomBytes(16).toString("base64url"),
      expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
    });

    await this.logAction({
      companyId: input.companyId,
      appId: installation.appId,
      installationId: installation.id,
      action: "google_calendar.oauth.start",
      status: AppActionStatus.SUCCESS,
      targetType: "app_installation",
      targetId: installation.id,
      metadata: { scopes: GOOGLE_CALENDAR_SCOPES },
    });

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);

    return url.toString();
  }

  async handleCallback(input: {
    code: string;
    state: string;
  }): Promise<{ redirectUrl: string }> {
    const config = this.getRequiredOAuthConfig();
    const state = this.verifyState(input.state);
    const installation = await this.findInstallationForState(state);

    try {
      const tokenResponse = await this.exchangeCodeForTokens(input.code, config);
      const existingCredential = await this.findActiveCredential(state.companyId, state.installationId);
      const refreshToken = tokenResponse.refresh_token ?? this.decryptRefreshToken(existingCredential);

      if (!tokenResponse.access_token || !refreshToken) {
        throw new BadRequestException(
          "Google did not return the tokens required to complete the connection.",
        );
      }

      const expiresAt =
        typeof tokenResponse.expires_in === "number"
          ? new Date(Date.now() + tokenResponse.expires_in * 1000)
          : null;
      const scopes = this.normalizeScopes(tokenResponse.scope);
      const providerAccountEmail = await this.resolveProviderAccountEmail(tokenResponse.access_token);
      const encryptedAccessToken = this.encryptToken(tokenResponse.access_token);
      const encryptedRefreshToken = this.encryptToken(refreshToken);
      const connectedAt = new Date();

      await this.prisma.$transaction(async (tx) => {
        await tx.appCredential.updateMany({
          where: {
            companyId: state.companyId,
            installationId: state.installationId,
            provider: "google",
            status: Status.ACTIVE,
            ...(existingCredential ? { id: { not: existingCredential.id } } : {}),
          },
          data: { status: Status.INACTIVE },
        });

        if (existingCredential) {
          await tx.appCredential.update({
            where: { id: existingCredential.id },
            data: {
              type: AppCredentialType.OAUTH2,
              provider: "google",
              providerAccountEmail,
              encryptedAccessToken: encryptedAccessToken.encryptedToken,
              accessTokenIv: encryptedAccessToken.iv,
              accessTokenAuthTag: encryptedAccessToken.authTag,
              encryptedRefreshToken: encryptedRefreshToken.encryptedToken,
              refreshTokenIv: encryptedRefreshToken.iv,
              refreshTokenAuthTag: encryptedRefreshToken.authTag,
              scopes: scopes.join(" "),
              expiresAt,
              status: Status.ACTIVE,
              connectedAt: existingCredential.connectedAt ?? connectedAt,
              metadata: {
                provider: "google",
                tokenType: tokenResponse.token_type ?? "Bearer",
              },
            },
          });
        } else {
          await tx.appCredential.create({
            data: {
              companyId: state.companyId,
              installationId: state.installationId,
              type: AppCredentialType.OAUTH2,
              provider: "google",
              providerAccountEmail,
              encryptedAccessToken: encryptedAccessToken.encryptedToken,
              accessTokenIv: encryptedAccessToken.iv,
              accessTokenAuthTag: encryptedAccessToken.authTag,
              encryptedRefreshToken: encryptedRefreshToken.encryptedToken,
              refreshTokenIv: encryptedRefreshToken.iv,
              refreshTokenAuthTag: encryptedRefreshToken.authTag,
              scopes: scopes.join(" "),
              expiresAt,
              status: Status.ACTIVE,
              connectedAt,
              metadata: {
                provider: "google",
                tokenType: tokenResponse.token_type ?? "Bearer",
              },
            },
          });
        }

        await tx.appInstallation.update({
          where: { id: installation.id },
          data: {
            status: AppInstallationStatus.ACTIVE,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        });

        await tx.appActionLog.create({
          data: {
            companyId: state.companyId,
            appId: installation.appId,
            installationId: installation.id,
            action: "google_calendar.oauth.connected",
            status: AppActionStatus.SUCCESS,
            targetType: "app_installation",
            targetId: installation.id,
            metadata: {
              providerAccountEmail,
              scopes,
            },
          },
        });
      });

      return { redirectUrl: this.buildFrontendRedirectUrl("connected=1") };
    } catch (error) {
      await this.logAction({
        companyId: state.companyId,
        appId: installation.appId,
        installationId: installation.id,
        action: "google_calendar.oauth.failed",
        status: AppActionStatus.ERROR,
        targetType: "app_installation",
        targetId: installation.id,
        errorCode: this.toSafeGoogleErrorCode(error),
        errorMessage: this.toSafeGoogleErrorMessage(error),
      });

      throw error;
    }
  }

  async disconnect(input: { companyId: string; installationId?: string }): Promise<GoogleCalendarOAuthStatus> {
    const installation = await this.findGoogleCalendarInstallation(input.companyId, false, input.installationId);

    if (!installation) {
      return this.getStatus(input.companyId, input.installationId);
    }

    const credential = await this.findActiveCredential(input.companyId, installation.id);
    const accessToken = this.decryptAccessToken(credential);

    if (accessToken) {
      await this.revokeGoogleToken(accessToken);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.appCredential.updateMany({
        where: {
          companyId: input.companyId,
          installationId: installation.id,
          provider: "google",
          status: Status.ACTIVE,
        },
        data: { status: Status.INACTIVE },
      });
      await tx.googleCalendarResource.updateMany({
        where: {
          companyId: input.companyId,
          installationId: installation.id,
        },
        data: { active: false },
      });
      await tx.appInstallation.update({
        where: { id: installation.id },
        data: { status: AppInstallationStatus.INACTIVE },
      });
      await tx.appActionLog.create({
        data: {
          companyId: input.companyId,
          appId: installation.appId,
          installationId: installation.id,
          action: "google_calendar.oauth.disconnected",
          status: AppActionStatus.SUCCESS,
          targetType: "app_installation",
          targetId: installation.id,
          metadata: Prisma.JsonNull,
        },
      });
    });

    return this.getStatus(input.companyId, input.installationId);
  }

  async getStatus(companyId: string, installationId?: string): Promise<GoogleCalendarOAuthStatus> {
    const installation = await this.findGoogleCalendarInstallation(companyId, false, installationId);

    if (!installation) {
      if (installationId) {
        throw new BadRequestException("Google Agenda installation not found or cross-tenant access denied.");
      }
      return this.emptyStatus();
    }

    const credential = await this.findActiveCredential(companyId, installation.id);

    if (!credential) {
      return this.emptyStatus();
    }

    return {
      connected: true,
      providerAccountEmail: credential.providerAccountEmail,
      scopes: this.normalizeScopes(credential.scopes),
      connectedAt: credential.connectedAt,
      expiresAt: credential.expiresAt,
      lastRefreshAt: credential.lastRefreshAt,
    };
  }

  async getAuthorizedCredential(companyId: string, installationId?: string): Promise<GoogleAuthorizedCredential> {
    const installation = await this.findGoogleCalendarInstallation(companyId, true, installationId);
    if (installation.status !== AppInstallationStatus.ACTIVE) {
      throw new BadRequestException("Google Agenda installation is not active.");
    }

    const credential = await this.findActiveCredential(companyId, installation.id);

    if (!credential) {
      throw new BadRequestException("Google Agenda is not connected.");
    }

    const accessTokenIsValid =
      credential.expiresAt && credential.expiresAt.getTime() - TOKEN_REFRESH_SKEW_MS > Date.now();

    if (accessTokenIsValid) {
      const accessToken = this.decryptAccessToken(credential);
      if (!accessToken) {
        throw new BadRequestException("Stored Google credential is invalid.");
      }

      return {
        installationId: installation.id,
        appId: installation.appId,
        credentialId: credential.id,
        accessToken,
        scopes: this.normalizeScopes(credential.scopes),
        expiresAt: credential.expiresAt,
      };
    }

    return this.refreshAccessToken({ companyId, installation, credential });
  }

  sanitizeGoogleError(error: unknown): string {
    return this.toSafeGoogleErrorMessage(error);
  }

  private async refreshAccessToken(input: {
    companyId: string;
    installation: Pick<AppInstallation, "id" | "appId">;
    credential: GoogleCredentialRecord;
  }): Promise<GoogleAuthorizedCredential> {
    const config = this.getRequiredOAuthConfig();
    const refreshToken = this.decryptRefreshToken(input.credential);

    if (!refreshToken) {
      throw new BadRequestException("Google Agenda connection does not have a refresh token.");
    }

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const response = await this.fetchImpl(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const tokenResponse = (await response.json().catch(() => ({}))) as GoogleTokenResponse;

    if (!response.ok || !tokenResponse.access_token) {
      await this.logAction({
        companyId: input.companyId,
        appId: input.installation.appId,
        installationId: input.installation.id,
        action: "google_calendar.oauth.refresh_failed",
        status: AppActionStatus.ERROR,
        targetType: "app_credential",
        targetId: input.credential.id,
        errorCode: tokenResponse.error ?? String(response.status),
        errorMessage: this.toSafeGoogleErrorMessage(tokenResponse),
      });
      throw new BadRequestException("Google Agenda connection needs to be reconnected.");
    }

    const encryptedAccessToken = this.encryptToken(tokenResponse.access_token);
    const expiresAt =
      typeof tokenResponse.expires_in === "number"
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : null;
    const scopes = this.normalizeScopes(tokenResponse.scope || input.credential.scopes);
    const lastRefreshAt = new Date();

    await this.prisma.appCredential.update({
      where: { id: input.credential.id },
      data: {
        encryptedAccessToken: encryptedAccessToken.encryptedToken,
        accessTokenIv: encryptedAccessToken.iv,
        accessTokenAuthTag: encryptedAccessToken.authTag,
        scopes: scopes.join(" "),
        expiresAt,
        lastRefreshAt,
      },
    });

    await this.logAction({
      companyId: input.companyId,
      appId: input.installation.appId,
      installationId: input.installation.id,
      action: "google_calendar.oauth.refreshed",
      status: AppActionStatus.SUCCESS,
      targetType: "app_credential",
      targetId: input.credential.id,
      metadata: { expiresAt: expiresAt?.toISOString() ?? null },
    });

    return {
      installationId: input.installation.id,
      appId: input.installation.appId,
      credentialId: input.credential.id,
      accessToken: tokenResponse.access_token,
      scopes,
      expiresAt,
    };
  }

  private getRequiredOAuthConfig(): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  } {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID")?.trim() ?? "";
    const clientSecret = this.configService.get<string>("GOOGLE_CLIENT_SECRET")?.trim() ?? "";
    const redirectUri =
      this.configService.get<string>("GOOGLE_CALENDAR_REDIRECT_URI")?.trim() ?? "";

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        "Google Agenda OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALENDAR_REDIRECT_URI.",
      );
    }

    this.getEncryptionKeyBuffer();

    return { clientId, clientSecret, redirectUri };
  }

  private async ensureGoogleCalendarInstallation(
    companyId: string,
    userId: string | null,
    installationId?: string,
  ): Promise<Pick<AppInstallation, "id" | "appId" | "status">> {
    const app = await this.prisma.app.findUnique({
      where: { slug: GOOGLE_CALENDAR_SLUG },
      select: { id: true },
    });

    if (!app) {
      throw new BadRequestException("Google Agenda is not available in the app catalog.");
    }

    if (installationId) {
      const existing = await this.prisma.appInstallation.findFirst({
        where: { id: installationId, companyId, appId: app.id },
        select: { id: true, appId: true, status: true },
      });
      if (existing) {
        return existing;
      }
    }

    return this.prisma.appInstallation.create({
      data: {
        companyId,
        appId: app.id,
        status: AppInstallationStatus.INACTIVE,
        installedByUserId: userId,
      },
      select: {
        id: true,
        appId: true,
        status: true,
      },
    });
  }

  private async findGoogleCalendarInstallation(
    companyId: string,
    requireInstalled: true,
    installationId?: string,
  ): Promise<Pick<AppInstallation, "id" | "appId" | "status">>;
  private async findGoogleCalendarInstallation(
    companyId: string,
    requireInstalled: false,
    installationId?: string,
  ): Promise<Pick<AppInstallation, "id" | "appId" | "status"> | null>;
  private async findGoogleCalendarInstallation(
    companyId: string,
    requireInstalled: boolean,
    installationId?: string,
  ): Promise<Pick<AppInstallation, "id" | "appId" | "status"> | null> {
    const app = await this.prisma.app.findUnique({
      where: { slug: GOOGLE_CALENDAR_SLUG },
      select: { id: true },
    });

    if (!app) {
      if (requireInstalled) {
        throw new BadRequestException("Google Agenda is not available in the app catalog.");
      }
      return null;
    }

    if (installationId) {
      const installation = await this.prisma.appInstallation.findFirst({
        where: {
          id: installationId,
          companyId,
          appId: app.id,
        },
        select: {
          id: true,
          appId: true,
          status: true,
        },
      });

      if (!installation && requireInstalled) {
        throw new BadRequestException("Google Agenda installation not found or cross-tenant access denied.");
      }
      return installation;
    }

    const installation = await this.prisma.appInstallation.findFirst({
      where: {
        companyId,
        appId: app.id,
      },
      select: {
        id: true,
        appId: true,
        status: true,
      },
    });

    if (!installation) {
      if (requireInstalled) {
        throw new BadRequestException("Install Google Agenda before connecting Google.");
      }

      return null;
    }

    return installation;
  }

  private async findInstallationForState(
    state: OAuthStatePayload,
  ): Promise<Pick<AppInstallation, "id" | "appId" | "status">> {
    const installation = await this.prisma.appInstallation.findFirst({
      where: {
        id: state.installationId,
        companyId: state.companyId,
      },
      select: {
        id: true,
        appId: true,
        status: true,
      },
    });

    if (!installation) {
      throw new BadRequestException("Invalid Google OAuth state.");
    }

    return installation;
  }

  private async findActiveCredential(
    companyId: string,
    installationId: string,
  ): Promise<GoogleCredentialRecord | null> {
    return this.prisma.appCredential.findFirst({
      where: {
        companyId,
        installationId,
        provider: "google",
        status: Status.ACTIVE,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        companyId: true,
        installationId: true,
        providerAccountEmail: true,
        encryptedAccessToken: true,
        accessTokenIv: true,
        accessTokenAuthTag: true,
        encryptedRefreshToken: true,
        refreshTokenIv: true,
        refreshTokenAuthTag: true,
        scopes: true,
        expiresAt: true,
        status: true,
        connectedAt: true,
        lastRefreshAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private async exchangeCodeForTokens(
    code: string,
    config: { clientId: string; clientSecret: string; redirectUri: string },
  ): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });

    const response = await this.fetchImpl(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json().catch(() => ({}))) as GoogleTokenResponse;

    if (!response.ok || payload.error) {
      throw new BadRequestException(this.toSafeGoogleErrorMessage(payload));
    }

    return payload;
  }

  private async resolveProviderAccountEmail(accessToken: string): Promise<string | null> {
    try {
      const response = await this.fetchImpl(`${GOOGLE_CALENDAR_LIST_URL}?minAccessRole=reader`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json().catch(() => ({}))) as GoogleCalendarListResponse;
      const primaryCalendar = payload.items?.find((item) => item.primary && item.id);
      return primaryCalendar?.id ?? null;
    } catch {
      return null;
    }
  }

  private async revokeGoogleToken(accessToken: string): Promise<void> {
    try {
      await this.fetchImpl(GOOGLE_REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: accessToken }),
      });
    } catch {
      // Local disconnect still succeeds even if Google's revoke endpoint is unavailable.
    }
  }

  private signState(payload: OAuthStatePayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = createHmac("sha256", this.getStateSigningKey())
      .update(encodedPayload)
      .digest("base64url");
    return `${encodedPayload}.${signature}`;
  }

  private verifyState(state: string): OAuthStatePayload {
    const [encodedPayload, signature] = state.split(".");

    if (!encodedPayload || !signature) {
      throw new BadRequestException("Invalid Google OAuth state.");
    }

    const expectedSignature = createHmac("sha256", this.getStateSigningKey())
      .update(encodedPayload)
      .digest("base64url");
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new BadRequestException("Invalid Google OAuth state.");
    }

    let payload: OAuthStatePayload;
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    } catch {
      throw new BadRequestException("Invalid Google OAuth state.");
    }

    if (
      !payload.companyId ||
      !payload.installationId ||
      !payload.nonce ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < Date.now()
    ) {
      throw new BadRequestException("Invalid or expired Google OAuth state.");
    }

    return payload;
  }

  private encryptToken(token: string): EncryptedTokenPayload {
    const encryptionKey = this.getEncryptionKeyBuffer();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedToken: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      authTag: authTag.toString("base64"),
    };
  }

  private decryptAccessToken(credential: GoogleCredentialRecord | null): string {
    if (!credential?.encryptedAccessToken || !credential.accessTokenIv || !credential.accessTokenAuthTag) {
      return "";
    }

    return this.decryptToken({
      encryptedToken: credential.encryptedAccessToken,
      iv: credential.accessTokenIv,
      authTag: credential.accessTokenAuthTag,
    });
  }

  private decryptRefreshToken(credential: GoogleCredentialRecord | null): string {
    if (
      !credential?.encryptedRefreshToken ||
      !credential.refreshTokenIv ||
      !credential.refreshTokenAuthTag
    ) {
      return "";
    }

    return this.decryptToken({
      encryptedToken: credential.encryptedRefreshToken,
      iv: credential.refreshTokenIv,
      authTag: credential.refreshTokenAuthTag,
    });
  }

  private decryptToken(payload: EncryptedTokenPayload): string {
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.getEncryptionKeyBuffer(),
        Buffer.from(payload.iv, "base64"),
      );
      decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

      return Buffer.concat([
        decipher.update(Buffer.from(payload.encryptedToken, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new BadRequestException("Stored Google credential could not be decrypted.");
    }
  }

  private getEncryptionKeyBuffer(): Buffer {
    const rawKey = this.configService.get<string>("APP_ENCRYPTION_KEY")?.trim() ?? "";

    if (!rawKey) {
      throw new BadRequestException("APP_ENCRYPTION_KEY is required to connect Google Agenda.");
    }

    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      return Buffer.from(rawKey, "hex");
    }

    const base64Buffer = Buffer.from(rawKey, "base64");
    if (base64Buffer.length === 32) {
      return base64Buffer;
    }

    throw new BadRequestException("APP_ENCRYPTION_KEY must be a 32-byte key encoded as hex or base64.");
  }

  private getStateSigningKey(): Buffer {
    return this.getEncryptionKeyBuffer();
  }

  public buildFrontendRedirectUrl(queryString: string): string {
    const configuredCorsOrigin = this.configService.get<string>("CORS_ORIGIN")?.split(",")[0]?.trim();
    const origin = configuredCorsOrigin || DEFAULT_CORS_ORIGIN;
    return `${origin.replace(/\/$/, "")}/apps/google-calendar?${queryString}`;
  }

  private emptyStatus(): GoogleCalendarOAuthStatus {
    return {
      connected: false,
      providerAccountEmail: null,
      scopes: [],
      connectedAt: null,
      expiresAt: null,
      lastRefreshAt: null,
    };
  }

  private normalizeScopes(scopes?: string | null): string[] {
    return (scopes ?? "")
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }

  private toSafeGoogleErrorCode(error: unknown): string {
    if (typeof error === "object" && error !== null && "error" in error) {
      const value = (error as { error?: unknown }).error;
      if (typeof value === "string" && value.trim()) {
        return value.slice(0, 80);
      }
    }

    return "google_oauth_error";
  }

  private toSafeGoogleErrorMessage(error: unknown): string {
    if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
      const response = error.getResponse();
      if (typeof response === "string") {
        return response;
      }
      if (
        typeof response === "object" &&
        response !== null &&
        "message" in response &&
        typeof (response as { message?: unknown }).message === "string"
      ) {
        return (response as { message: string }).message;
      }
    }

    if (typeof error === "object" && error !== null) {
      const candidate = error as { error_description?: unknown; error?: unknown };
      if (typeof candidate.error_description === "string" && candidate.error_description.trim()) {
        return candidate.error_description.slice(0, 300);
      }
      if (typeof candidate.error === "string" && candidate.error.trim()) {
        return `Google OAuth error: ${candidate.error.slice(0, 120)}`;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.slice(0, 300);
    }

    return "Google Agenda request failed.";
  }

  private async logAction(input: {
    companyId: string;
    appId: string;
    installationId?: string | null;
    action: string;
    status: AppActionStatus;
    targetType?: string | null;
    targetId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    try {
      await this.prisma.appActionLog.create({
        data: {
          companyId: input.companyId,
          appId: input.appId,
          installationId: input.installationId ?? null,
          action: input.action,
          status: input.status,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          errorCode: input.errorCode ?? null,
          errorMessage: input.errorMessage ?? null,
          metadata: input.metadata ?? Prisma.JsonNull,
        },
      });
    } catch {
      // OAuth logs must not break the user-facing flow.
    }
  }
}
