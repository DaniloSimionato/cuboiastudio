export type TemperatureLevel = {
  value: number;
  name: string;
  description: string;
  risk: string;
};

export const SYSTEM_DEFAULT_TEMPERATURE = 0.2;
export const RECOMMENDED_WHATSAPP_TEMPERATURE = 0.6;

export const TEMPERATURE_LEVELS: TemperatureLevel[] = [
  { value: 0, name: "Determinística", description: "Muito previsível e consistente.", risk: "Pode soar repetitiva." },
  { value: 0.2, name: "Precisa", description: "Prioriza clareza e fidelidade às instruções.", risk: "Pouca variação na escrita." },
  { value: 0.4, name: "Equilibrada", description: "Combina consistência com alguma naturalidade.", risk: "Boa opção geral." },
  { value: 0.6, name: "Natural", description: "Conversa mais fluida mantendo boa aderência às regras.", risk: "Recomendada para WhatsApp." },
  { value: 0.8, name: "Criativa", description: "Traz mais variação e flexibilidade na escrita.", risk: "Pode variar mais do padrão." },
  { value: 1, name: "Muito criativa", description: "Maximiza a diversidade da resposta.", risk: "Maior risco de fugir do esperado." },
];

export function getTemperatureLevel(value: number): TemperatureLevel {
  if (value > 1) {
    return {
      value,
      name: "Muito alta",
      description: "Aumenta bastante a diversidade da escrita.",
      risk: "Alto risco de fugir do padrão esperado.",
    };
  }

  return TEMPERATURE_LEVELS.reduce((closest, level) =>
    Math.abs(level.value - value) < Math.abs(closest.value - value) ? level : closest,
  );
}

export function modelSupportsTemperature(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  if (!normalized) return true;

  // Reasoning models commonly reject the temperature parameter in compatible APIs.
  return !/^(o1|o3|o4|gpt-5)([-.:]|$)/.test(normalized);
}
