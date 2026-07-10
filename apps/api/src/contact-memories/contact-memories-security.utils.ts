import { BadRequestException } from "@nestjs/common";

export const SENSITIVE_PATTERNS: RegExp[] = [
  /\d{3}\.\d{3}\.\d{3}-\d{2}/, // CPF
  /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/, // CNPJ
  /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/, // Credit Card
  /\b(cvv|cvc)[:\s]*\d{3,4}\b/i,
  /(sk-|api[_-]?key|bearer|token|secret)[:\s]*[a-zA-Z0-9_\-]{8,}/i,
  /(código|code|otp|2fa|autentica[cç][aã]o)[:\s]*\d{4,8}/i,
  /(senha|password|pwd)[:\s]+\S+/i,
];

export const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore (all )?(previous|prior) instructions/i,
  /desconsidere (todas )?as instru[cç][oõ]es/i,
  /system prompt/i,
  /developer message/i,
  /tool call/i,
  /execute command/i,
  /ignore todas as regras/i,
];

export const BLOCKED_KEYS = [
  "password",
  "senha",
  "token",
  "api_key",
  "apikey",
  "secret",
  "cvv",
  "cvc",
  "otp",
  "pin",
  "cpf_full",
  "cnpj_full",
  "card_number",
  "credit_card",
  "system_prompt",
  "developer_message",
];

export function validateMemorySafety(key: string, value: string) {
  const cleanKey = (key ?? "").trim().toLowerCase();
  if (BLOCKED_KEYS.includes(cleanKey)) {
    throw new BadRequestException(`Chave de memória bloqueada por segurança: ${key}`);
  }

  const normalizedValue = (value ?? "").replace(/```/g, "").replace(/\s+/g, " ").trim();

  const hasSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(normalizedValue));
  if (hasSensitive) {
    throw new BadRequestException("O valor da memória contém dados sensíveis bloqueados por segurança.");
  }

  const hasInjection = PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(normalizedValue));
  if (hasInjection) {
    throw new BadRequestException("O valor da memória contém padrões de prompt injection bloqueados por segurança.");
  }
}
