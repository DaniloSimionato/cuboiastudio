import { m as createFileRoute, p as lazyRouteComponent } from "./_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.agentes.novo-2UjU33Cj.js
var $$splitComponentImporter = () => import("./_app.agentes.novo-PTKaumiF.mjs");
var Route = createFileRoute("/_app/agentes/novo")({
	validateSearch: (search) => ({ assistantId: typeof search.assistantId === "string" ? search.assistantId : void 0 }),
	head: () => ({ meta: [{ title: "Novo agente · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
