import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getEncryptionKeyBuffer(): Buffer {
  let rawKey = process.env.APP_ENCRYPTION_KEY?.trim() ?? "";
  if (!rawKey && process.env.NODE_ENV === "test") {
    rawKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  }
  if (!rawKey) {
    throw new Error("APP_ENCRYPTION_KEY is required for custom webhook credentials encryption.");
  }
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }
  const base64Buffer = Buffer.from(rawKey, "base64");
  if (base64Buffer.length === 32) {
    return base64Buffer;
  }
  throw new Error("APP_ENCRYPTION_KEY must be a 32-byte key encoded as hex or base64.");
}

export function encryptData(data: string): { encryptedData: string; iv: string; authTag: string } {
  const key = getEncryptionKeyBuffer();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedData: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptData(payload: { encryptedData: string; iv: string; authTag: string }): string {
  try {
    const key = getEncryptionKeyBuffer();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(payload.encryptedData, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch (err) {
    throw new Error("Erro de segurança: credenciais corrompidas ou inválidas.");
  }
}

export async function getOrMigrateWebhookCredentials(
  prisma: any,
  actionId: string,
  authType: string,
  authConfig: any
): Promise<any> {
  if (!authConfig || authType === "NONE") return null;

  const isEncrypted = authConfig.encryptedData && authConfig.iv && authConfig.authTag;
  if (isEncrypted) {
    return authConfig;
  }

  // Detect plaintext credentials and perform lazy migration
  try {
    const authStr = typeof authConfig === "string" ? authConfig : JSON.stringify(authConfig);
    
    // Ignore migration if credentials are masked or empty
    if (authStr.includes("••••••••") || authStr.includes("••••")) {
      return null;
    }

    const encrypted = encryptData(authStr);
    await prisma.customWebhookAction.update({
      where: { id: actionId },
      data: { authConfig: encrypted as any },
    });

    console.log(`[LAZY MIGRATION] Webhook credentials migrated and encrypted for action ID: ${actionId}`);
    return encrypted;
  } catch (err) {
    // Fail safe
    return null;
  }
}
