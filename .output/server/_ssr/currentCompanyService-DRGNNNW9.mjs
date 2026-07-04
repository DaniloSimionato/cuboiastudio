import { n as apiFetch } from "./apiClient-Bei-u2-_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/currentCompanyService-DRGNNNW9.js
var currentCompanyService = { async get() {
	return apiFetch("/companies/current");
} };
//#endregion
export { currentCompanyService as t };
