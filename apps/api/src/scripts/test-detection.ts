import { detectDirectBusinessHoursDecision } from "../assistant-conversations/business-hours-direct-deterministic";
import { normalizeIntentText } from "../intent-router/intent-routing";

const messages = [
  "Voces fazem manutencao de impresoras fiscais?",
  "Boa tarde, tudo bem?",
  "Qual o valor pra arrumar?",
  "Minha impressora nao ta funcionando",
  "Voces fazem manutencao de impressoras?",
];

for (const msg of messages) {
  const normalized = normalizeIntentText(msg);
  const result = detectDirectBusinessHoursDecision(msg);
  console.log(`\n--- Message: "${msg}"`);
  console.log(`    Normalized: "${normalized}"`);
  console.log(`    Decision: ${JSON.stringify(result)}`);
  
  // Manual regex checks
  const NON_BUSINESS_TEMPORAL_ANCHOR =
    "que horas|qual(?: o)? horario|quando|que dia|hoje|amanha|ontem|segunda|terca|quarta|quinta|sexta|sabado|domingo|fim de semana|final de semana|finais de semana|manha|tarde|noite|depois do almoco|previsao|prazo|acontece|comeca|sera|ficou|as\\s*\\d{1,2}(?::\\d{2})?|\\d{1,2}:\\d{2}|\\d{1,2}[/-]\\d{1,2}(?:[/-]\\d{2,4})?";
  const hasTemporalAnchor = new RegExp(`\\b(?:${NON_BUSINESS_TEMPORAL_ANCHOR})\\b`).test(normalized);
  const hasLegacyTemporalStatus = /\b(?:aberto|fechado)\b/.test(normalized);
  
  if (hasTemporalAnchor) {
    // Find which anchor matched
    const anchors = NON_BUSINESS_TEMPORAL_ANCHOR.split("|");
    for (const a of anchors) {
      try {
        if (new RegExp(`\\b(?:${a})\\b`).test(normalized)) {
          console.log(`    ⚠️  TEMPORAL ANCHOR MATCHED: "${a}"`);
        }
      } catch {}
    }
  }
  console.log(`    hasTemporalAnchor: ${hasTemporalAnchor}`);
  console.log(`    hasLegacyTemporalStatus: ${hasLegacyTemporalStatus}`);
  
  if (hasTemporalAnchor || hasLegacyTemporalStatus) {
    if (/\b(?:tecnico|instalador|instalacao|manutencao|visita)\b/.test(normalized)) {
      console.log(`    ⚠️  CATEGORY MATCH: TECHNICIAN (manutencao/tecnico/etc)`);
    }
  }
}
