import { m as createFileRoute, p as lazyRouteComponent } from "./_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.apps.google-calendar-BU8IhSNL.js
var $$splitComponentImporter = () => import("./_app.apps.google-calendar-4XfGoZUu.mjs");
var Route = createFileRoute("/_app/apps/google-calendar")({
	validateSearch: (search) => {
		return { installationId: search.installationId };
	},
	head: () => ({ meta: [{ title: "Google Agenda · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
