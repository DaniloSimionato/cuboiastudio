import { createHash } from "node:crypto";

export type V2PrimarySecurityRule = {
  id?: string;
  companyId?: string;
  assistantId?: string;
  name: string;
  ruleType: string;
  instruction: string;
};

export type V2PrimarySecurityRulesEvaluation = {
  allowed: boolean;
  blockers: string[];
  activeRuleCount: number;
  rulesFingerprint: string | null;
  qualityConstraints: {
    prohibitsInternalDisclosure: boolean;
    prohibitsCommercialClaims: boolean;
    prohibitsHandoffClaims: boolean;
  };
  redactionApplied: true;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprint(rules: readonly V2PrimarySecurityRule[]): string | null {
  if (rules.length === 0) return null;
  const stable = rules.map((rule) => ({
    id: rule.id ?? null,
    name: rule.name,
    ruleType: rule.ruleType,
    instruction: rule.instruction,
  }));
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 16);
}

function has(text: string, expression: RegExp): boolean {
  return expression.test(text);
}

/**
 * The first primary category is deliberately much narrower than V1. Rules that
 * require a human, a tool, or content outside structured business hours block
 * V2 before a provider can run. Other active rules remain part of the prompt
 * and are covered by the explicit response constraints below.
 */
export function evaluateV2PrimarySecurityRules(
  rules: readonly V2PrimarySecurityRule[],
  scope?: { companyId: string; assistantId: string },
): V2PrimarySecurityRulesEvaluation {
  const scopedRules = scope
    ? rules.filter(
        (rule) =>
          (!rule.companyId || rule.companyId === scope.companyId) &&
          (!rule.assistantId || rule.assistantId === scope.assistantId),
      )
    : rules;
  const blockers = new Set<string>();
  let prohibitsInternalDisclosure = true;
  let prohibitsCommercialClaims = true;
  let prohibitsHandoffClaims = true;

  for (const rule of scopedRules) {
    const name = rule.name?.trim();
    const ruleType = rule.ruleType?.trim();
    const instruction = rule.instruction?.trim();
    if (!name || !ruleType || !instruction) {
      blockers.add("SECURITY_RULE_INVALID");
      continue;
    }
    const text = normalize(`${name} ${ruleType} ${instruction}`);

    if (
      has(
        text,
        /\b(?:nao responda|nao responder|proib(?:ir|ido).*resposta automatica|somente humano|atendente obrigatorio|transfer(?:ir|encia) obrigatoria)\b/,
      )
    ) {
      blockers.add("SECURITY_RULE_AUTO_RESPONSE_BLOCKED");
    }
    if (has(text, /\b(?:handoff|transfer(?:ir|encia)|atendente|humano)\b/)) {
      blockers.add("SECURITY_RULE_HANDOFF_REQUIRED");
      prohibitsHandoffClaims = true;
    }
    if (has(text, /\b(?:ferramenta|tool|api externa|sistema externo|consultar sistema)\b/)) {
      blockers.add("SECURITY_RULE_TOOL_REQUIRED");
    }
    if (
      has(
        text,
        /\b(?:nao informar|proib(?:ir|ido)|nunca (?:informar|informe|responder)).{0,40}\b(?:horario|atendimento|abertura|fechamento)\b/,
      )
    ) {
      blockers.add("SECURITY_RULE_BUSINESS_HOURS_BLOCKED");
    }
    if (
      has(
        text,
        /\b(?:sempre|obrigatoriamente|deve).{0,50}\b(?:preco|valor|estoque|garantia|prazo|agendamento|diagnostico|conserto)\b/,
      )
    ) {
      blockers.add("SECURITY_RULE_CATEGORY_CONFLICT");
    }
    prohibitsInternalDisclosure ||= has(
      text,
      /\b(?:interno|token|senha|credencial|prompt|regra)\b/,
    );
    prohibitsCommercialClaims ||= has(
      text,
      /\b(?:preco|valor|estoque|garantia|prazo|agendamento|diagnostico)\b/,
    );
  }

  return {
    allowed: blockers.size === 0,
    blockers: [...blockers].sort(),
    activeRuleCount: scopedRules.length,
    rulesFingerprint: fingerprint(scopedRules),
    qualityConstraints: {
      prohibitsInternalDisclosure,
      prohibitsCommercialClaims,
      prohibitsHandoffClaims,
    },
    redactionApplied: true,
  };
}

export function responseCompliesWithV2PrimarySecurityRules(input: {
  responseText: string;
  evaluation: V2PrimarySecurityRulesEvaluation;
}): boolean {
  const text = normalize(input.responseText);
  if (
    input.evaluation.qualityConstraints.prohibitsInternalDisclosure &&
    has(text, /\b(?:token|senha|credencial|prompt interno|regra interna)\b/)
  ) {
    return false;
  }
  if (
    input.evaluation.qualityConstraints.prohibitsCommercialClaims &&
    has(text, /\b(?:r\$|reais|preco|valor|estoque|garantia|prazo|agendamento|diagnostico)\b/)
  ) {
    return false;
  }
  return !(
    input.evaluation.qualityConstraints.prohibitsHandoffClaims &&
    has(text, /\b(?:vou transferir|encaminharei|atendente humano|handoff)\b/)
  );
}
