import { n as apiFetch } from "./apiClient-DG1jAm9p.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/currentCompanyService-Dc1_O9TA.js
var currentCompanyService = { async get() {
	return apiFetch("/companies/current");
} };
//#endregion
export { currentCompanyService as t };
