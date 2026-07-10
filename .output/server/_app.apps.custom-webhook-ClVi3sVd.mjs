import { m as createFileRoute, p as lazyRouteComponent } from "./_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_app.apps.custom-webhook-ClVi3sVd.js
var $$splitComponentImporter = () => import("./_app.apps.custom-webhook-D1HRJFee.mjs");
var Route = createFileRoute("/_app/apps/custom-webhook")({
	validateSearch: (search) => {
		return { installationId: search.installationId };
	},
	head: () => ({ meta: [{ title: "Webhook Personalizado · Cubo AI Studio" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
