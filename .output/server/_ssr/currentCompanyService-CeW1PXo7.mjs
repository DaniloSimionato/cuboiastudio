import { n as apiFetch } from "./apiClient-Dme41CHA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/currentCompanyService-CeW1PXo7.js
var currentCompanyService = { async get() {
	return apiFetch("/companies/current");
} };
//#endregion
export { currentCompanyService as t };
