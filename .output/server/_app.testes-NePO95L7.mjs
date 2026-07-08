import { m as createFileRoute, p as lazyRouteComponent } from "./_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.testes-NePO95L7.js
var $$splitComponentImporter = () => import("./_app.testes-BzlAz1Gk.mjs");
var Route = createFileRoute("/_app/testes")({
	validateSearch: (search) => ({ assistantId: typeof search.assistantId === "string" ? search.assistantId : void 0 }),
	head: () => ({ meta: [{ title: "Testar Agente · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
