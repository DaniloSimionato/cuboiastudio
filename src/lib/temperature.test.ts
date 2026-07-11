import assert from "node:assert/strict";
import test from "node:test";
import {
  getTemperatureLevel,
  modelSupportsTemperature,
  RECOMMENDED_WHATSAPP_TEMPERATURE,
  SYSTEM_DEFAULT_TEMPERATURE,
} from "./temperature.ts";

test("temperatura expõe níveis diferentes e recomendação de WhatsApp", () => {
  assert.equal(SYSTEM_DEFAULT_TEMPERATURE, 0.2);
  assert.equal(RECOMMENDED_WHATSAPP_TEMPERATURE, 0.6);
  assert.equal(getTemperatureLevel(0).name, "Determinística");
  assert.equal(getTemperatureLevel(0.6).name, "Natural");
  assert.equal(getTemperatureLevel(1.4).name, "Muito alta");
});

test("modelos de raciocínio não recebem temperature", () => {
  assert.equal(modelSupportsTemperature("gpt-4o-mini"), true);
  assert.equal(modelSupportsTemperature("o3-mini"), false);
  assert.equal(modelSupportsTemperature("gpt-5"), false);
});
