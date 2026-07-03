import { n as apiFetch } from "./apiClient-DVSvK5lD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/currentCompanyService-A6Wk0NSi.js
var currentCompanyService = { async get() {
	return apiFetch("/companies/current");
} };
//#endregion
export { currentCompanyService as t };
