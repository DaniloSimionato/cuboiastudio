import assert from "node:assert/strict";
import { test } from "node:test";
import { TOOLS_EMPTY_STATE } from "./tools-empty-state.ts";

test("Ferramentas possui estado vazio seguro e profissional", () => {
  assert.equal(TOOLS_EMPTY_STATE.title, "Nenhuma ferramenta configurada.");
  assert.match(TOOLS_EMPTY_STATE.description, /integrações, ações ou funções/);
});
