globalThis.__nitro_main__ = import.meta.url;
import { a as toEventHandler, c as NodeResponse, i as defineLazyEventHandler, l as serve, n as HTTPError, r as defineHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/app-icons/Zapier.png": {
		"type": "image/png",
		"etag": "\"547c-p/kK8ggTX4E4MoOtDSBuZIfDmGE\"",
		"mtime": "2026-07-08T20:46:07.489Z",
		"size": 21628,
		"path": "../public/app-icons/Zapier.png"
	},
	"/app-icons/chatwoot.svg": {
		"type": "image/svg+xml",
		"etag": "\"12b-IwzCT0TZHN8aETVLpfNgMrSxQ9w\"",
		"mtime": "2026-07-08T20:46:07.487Z",
		"size": 299,
		"path": "../public/app-icons/chatwoot.svg"
	},
	"/app-icons/discord.png": {
		"type": "image/png",
		"etag": "\"8600-vVTknYFA7IZN0HAcmVCCx108Hxw\"",
		"mtime": "2026-07-08T20:46:07.488Z",
		"size": 34304,
		"path": "../public/app-icons/discord.png"
	},
	"/app-icons/calendario-do-google.png": {
		"type": "image/png",
		"etag": "\"2759-taoai6DpWI92OBoyFzTOtb8fT1A\"",
		"mtime": "2026-07-08T20:46:07.488Z",
		"size": 10073,
		"path": "../public/app-icons/calendario-do-google.png"
	},
	"/app-icons/gmail.png": {
		"type": "image/png",
		"etag": "\"1c63-f4Pxo52D+ggoUnx/Pl3vD5mN0zM\"",
		"mtime": "2026-07-08T20:46:07.489Z",
		"size": 7267,
		"path": "../public/app-icons/gmail.png"
	},
	"/app-icons/asana.svg": {
		"type": "image/svg+xml",
		"etag": "\"3bf-lwC8A4acEtviLVJB1j9c77G2lCs\"",
		"mtime": "2026-07-08T20:46:07.487Z",
		"size": 959,
		"path": "../public/app-icons/asana.svg"
	},
	"/app-icons/google-calendar.png": {
		"type": "image/png",
		"etag": "\"2759-taoai6DpWI92OBoyFzTOtb8fT1A\"",
		"mtime": "2026-07-08T20:46:07.488Z",
		"size": 10073,
		"path": "../public/app-icons/google-calendar.png"
	},
	"/app-icons/facebook.png": {
		"type": "image/png",
		"etag": "\"215f-7v4cE5CuzIbYoMh3Pwq34Gxr9uc\"",
		"mtime": "2026-07-08T20:46:07.488Z",
		"size": 8543,
		"path": "../public/app-icons/facebook.png"
	},
	"/app-icons/google-analytics.png": {
		"type": "image/png",
		"etag": "\"d89-fYiyrm/vi8uX+y187iqDw7010eU\"",
		"mtime": "2026-07-08T20:46:07.489Z",
		"size": 3465,
		"path": "../public/app-icons/google-analytics.png"
	},
	"/app-icons/.DS_Store": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"1804-5clYIp/qE06I7ZMlIvq+eX/3ozY\"",
		"mtime": "2026-07-08T20:46:07.487Z",
		"size": 6148,
		"path": "../public/app-icons/.DS_Store"
	},
	"/app-icons/google-docs.png": {
		"type": "image/png",
		"etag": "\"1577-eM7uq4YHnnjUyt4Sa7YZqF7oCmw\"",
		"mtime": "2026-07-08T20:46:07.489Z",
		"size": 5495,
		"path": "../public/app-icons/google-docs.png"
	},
	"/app-icons/google_docs.png": {
		"type": "image/png",
		"etag": "\"1577-eM7uq4YHnnjUyt4Sa7YZqF7oCmw\"",
		"mtime": "2026-07-08T20:46:07.490Z",
		"size": 5495,
		"path": "../public/app-icons/google_docs.png"
	},
	"/app-icons/google-drive.png": {
		"type": "image/png",
		"etag": "\"4c28-xO47kWModj+RxJLFDC8Pve3+M3s\"",
		"mtime": "2026-07-08T20:46:07.490Z",
		"size": 19496,
		"path": "../public/app-icons/google-drive.png"
	},
	"/app-icons/facebook-messenger.png": {
		"type": "image/png",
		"etag": "\"38ef-VoVomo92qJ5C1G6MxtDWrZMNIkA\"",
		"mtime": "2026-07-08T20:46:07.488Z",
		"size": 14575,
		"path": "../public/app-icons/facebook-messenger.png"
	},
	"/app-icons/google_meunegocio.png": {
		"type": "image/png",
		"etag": "\"49d0-hZP3wy07j7iSKZFZTmL4JRJZW4c\"",
		"mtime": "2026-07-08T20:46:07.490Z",
		"size": 18896,
		"path": "../public/app-icons/google_meunegocio.png"
	},
	"/app-icons/google-sheets.png": {
		"type": "image/png",
		"etag": "\"48d0-juq8pvQHu440tKTZ66rqcJWR630\"",
		"mtime": "2026-07-08T20:46:07.489Z",
		"size": 18640,
		"path": "../public/app-icons/google-sheets.png"
	},
	"/app-icons/hubspot.png": {
		"type": "image/png",
		"etag": "\"460f-HZPn0onTTSg8Bu8wNEdWv8Hqs1o\"",
		"mtime": "2026-07-08T20:46:07.490Z",
		"size": 17935,
		"path": "../public/app-icons/hubspot.png"
	},
	"/app-icons/google_sheets.png": {
		"type": "image/png",
		"etag": "\"48d0-juq8pvQHu440tKTZ66rqcJWR630\"",
		"mtime": "2026-07-08T20:46:07.490Z",
		"size": 18640,
		"path": "../public/app-icons/google_sheets.png"
	},
	"/app-icons/google_drive.png": {
		"type": "image/png",
		"etag": "\"4c28-xO47kWModj+RxJLFDC8Pve3+M3s\"",
		"mtime": "2026-07-08T20:46:07.490Z",
		"size": 19496,
		"path": "../public/app-icons/google_drive.png"
	},
	"/.DS_Store": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"1804-mXPO60RVjg6jB46Sr+5lGYklUnQ\"",
		"mtime": "2026-07-08T20:46:07.493Z",
		"size": 6148,
		"path": "../public/.DS_Store"
	},
	"/app-icons/ifood.svg": {
		"type": "image/svg+xml",
		"etag": "\"473-1ZTGgXtUytIljEsFCg4WHvmuzMQ\"",
		"mtime": "2026-07-08T20:46:07.490Z",
		"size": 1139,
		"path": "../public/app-icons/ifood.svg"
	},
	"/app-icons/instagram.png": {
		"type": "image/png",
		"etag": "\"793f-SFzfu07jOtno7aqfNQi3J/0g9Gs\"",
		"mtime": "2026-07-08T20:46:07.491Z",
		"size": 31039,
		"path": "../public/app-icons/instagram.png"
	},
	"/app-icons/make.png": {
		"type": "image/png",
		"etag": "\"32fd-/XD5hNRjIs5Z+F6+f5fsDWeo+tY\"",
		"mtime": "2026-07-08T20:46:07.491Z",
		"size": 13053,
		"path": "../public/app-icons/make.png"
	},
	"/app-icons/mercado-livre.svg": {
		"type": "image/svg+xml",
		"etag": "\"293f-rXo2dEBdCsV1f8rHqQb1fO5lunU\"",
		"mtime": "2026-07-08T20:46:07.491Z",
		"size": 10559,
		"path": "../public/app-icons/mercado-livre.svg"
	},
	"/app-icons/instagram.svg": {
		"type": "image/svg+xml",
		"etag": "\"f54-bBcsO5J4qM9FiKZ+fBAUrvVThg0\"",
		"mtime": "2026-07-08T20:46:07.490Z",
		"size": 3924,
		"path": "../public/app-icons/instagram.svg"
	},
	"/app-icons/notion.svg": {
		"type": "image/svg+xml",
		"etag": "\"3e1-xmJ7eJab3hA2yJ/8EX7PdpBhQ/g\"",
		"mtime": "2026-07-08T20:46:07.491Z",
		"size": 993,
		"path": "../public/app-icons/notion.svg"
	},
	"/app-icons/olx-104.svg": {
		"type": "image/svg+xml",
		"etag": "\"444-9dXg28LzZ9BbghuSICI15JPmUCE\"",
		"mtime": "2026-07-08T20:46:07.492Z",
		"size": 1092,
		"path": "../public/app-icons/olx-104.svg"
	},
	"/app-icons/olx.png": {
		"type": "image/png",
		"etag": "\"2cc7-22PEaWfFjEQZGC3qJ5NurCScm/k\"",
		"mtime": "2026-07-08T20:46:07.491Z",
		"size": 11463,
		"path": "../public/app-icons/olx.png"
	},
	"/app-icons/pipedrive.png": {
		"type": "image/png",
		"etag": "\"a8a-DxQzFZSqG1y9X/qNF4u3YVyvOks\"",
		"mtime": "2026-07-08T20:46:07.491Z",
		"size": 2698,
		"path": "../public/app-icons/pipedrive.png"
	},
	"/app-icons/rd-station.png": {
		"type": "image/png",
		"etag": "\"1f40-l/7+4jzW+JiJzg86Tps6MofapMk\"",
		"mtime": "2026-07-08T20:46:07.492Z",
		"size": 8e3,
		"path": "../public/app-icons/rd-station.png"
	},
	"/app-icons/shopee.svg": {
		"type": "image/svg+xml",
		"etag": "\"135c-DH2aaA4xzmuByDxwE65U+Eikgfg\"",
		"mtime": "2026-07-08T20:46:07.491Z",
		"size": 4956,
		"path": "../public/app-icons/shopee.svg"
	},
	"/app-icons/slack.png": {
		"type": "image/png",
		"etag": "\"46a0-yVU56eqGcBVeM4fexe01yVXr52A\"",
		"mtime": "2026-07-08T20:46:07.492Z",
		"size": 18080,
		"path": "../public/app-icons/slack.png"
	},
	"/app-icons/trello.png": {
		"type": "image/png",
		"etag": "\"1e24-VJt7y9CiNFH/wWyGo5bmHMrSxfc\"",
		"mtime": "2026-07-08T20:46:07.492Z",
		"size": 7716,
		"path": "../public/app-icons/trello.png"
	},
	"/app-icons/webhook.png": {
		"type": "image/png",
		"etag": "\"2b69-cRIS8q7Pjy/6EtbJsd32A3EKX3s\"",
		"mtime": "2026-07-08T20:46:07.492Z",
		"size": 11113,
		"path": "../public/app-icons/webhook.png"
	},
	"/app-icons/whatsapp.png": {
		"type": "image/png",
		"etag": "\"59d5-atlOLIls4CQU3KOKKJIzxrqdQTU\"",
		"mtime": "2026-07-08T20:46:07.493Z",
		"size": 22997,
		"path": "../public/app-icons/whatsapp.png"
	},
	"/app-icons/whatsapp.svg": {
		"type": "image/svg+xml",
		"etag": "\"986-JvXUU1i4OukEpQrAYsml9Xpt7XM\"",
		"mtime": "2026-07-08T20:46:07.493Z",
		"size": 2438,
		"path": "../public/app-icons/whatsapp.svg"
	},
	"/app-icons/youtube.svg": {
		"type": "image/svg+xml",
		"etag": "\"291-Qg/BcWkRXUiliTORgKWI94/ldxI\"",
		"mtime": "2026-07-08T20:46:07.492Z",
		"size": 657,
		"path": "../public/app-icons/youtube.svg"
	},
	"/assets/MaskedSecretInput-CCuV5lWe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a9-BEzbjDK5RspbFDASJNBVFEWz/h0\"",
		"mtime": "2026-07-08T20:46:05.868Z",
		"size": 1705,
		"path": "../public/assets/MaskedSecretInput-CCuV5lWe.js"
	},
	"/assets/Combination-SNYDYYkG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bec2-SgzoQEOWR6LUWxovyyaaP/+IVaA\"",
		"mtime": "2026-07-08T20:46:05.868Z",
		"size": 48834,
		"path": "../public/assets/Combination-SNYDYYkG.js"
	},
	"/assets/PageHeader-DXqlJWYl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e0-LHUQmhOgP+cPCKjR8IHb0f7ZMlM\"",
		"mtime": "2026-07-08T20:46:05.868Z",
		"size": 992,
		"path": "../public/assets/PageHeader-DXqlJWYl.js"
	},
	"/assets/SecurityNotice-YeGzfdrO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"411-Xn/sdgzkMYoYtvrFC/VAx3EWRuk\"",
		"mtime": "2026-07-08T20:46:05.868Z",
		"size": 1041,
		"path": "../public/assets/SecurityNotice-YeGzfdrO.js"
	},
	"/assets/States-C8fb-d0V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9c6-4Oqw8idazso4i4vfo57ysjo3mPI\"",
		"mtime": "2026-07-08T20:46:05.868Z",
		"size": 2502,
		"path": "../public/assets/States-C8fb-d0V.js"
	},
	"/assets/StatusBadge-C3n8NVJF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"abb-kkZd3IxTPMZ0lY5B4WVyz8Z2kWs\"",
		"mtime": "2026-07-08T20:46:05.869Z",
		"size": 2747,
		"path": "../public/assets/StatusBadge-C3n8NVJF.js"
	},
	"/assets/_app-TisOp56S.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4a08-wOTbnK8PrOFv9akqgeCmbX2R4nk\"",
		"mtime": "2026-07-08T20:46:05.869Z",
		"size": 18952,
		"path": "../public/assets/_app-TisOp56S.js"
	},
	"/app-icons/slack-182.svg": {
		"type": "image/svg+xml",
		"etag": "\"5da-Rh43FoQ0GZ8VXcjcsTTkWCZzWAg\"",
		"mtime": "2026-07-08T20:46:07.492Z",
		"size": 1498,
		"path": "../public/app-icons/slack-182.svg"
	},
	"/assets/_app.apps.google-calendar-BRR9ceMG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bd69-n6mVYCMqKn9eKQsZe724FzEvlzM\"",
		"mtime": "2026-07-08T20:46:05.870Z",
		"size": 48489,
		"path": "../public/assets/_app.apps.google-calendar-BRR9ceMG.js"
	},
	"/assets/_app.agentes.novo-C7GK6MSI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ed19-dxJT7m3CWCAgagbUtp+jjuQxEmg\"",
		"mtime": "2026-07-08T20:46:05.869Z",
		"size": 126233,
		"path": "../public/assets/_app.agentes.novo-C7GK6MSI.js"
	},
	"/assets/_app.canais-DB53pzLi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"289d-BDLvZrNtqv4esvIJmwDe2eMMo2M\"",
		"mtime": "2026-07-08T20:46:05.870Z",
		"size": 10397,
		"path": "../public/assets/_app.canais-DB53pzLi.js"
	},
	"/assets/_app.agentes.index-Be3pvlgJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"232c-65X//vYEqvEmi5TTCJKfTLgAD4o\"",
		"mtime": "2026-07-08T20:46:05.869Z",
		"size": 9004,
		"path": "../public/assets/_app.agentes.index-Be3pvlgJ.js"
	},
	"/assets/_app.apps.index-CHwzzoby.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4c2c-991WUT2QgRVvcNfzpifvU30DkQc\"",
		"mtime": "2026-07-08T20:46:05.870Z",
		"size": 19500,
		"path": "../public/assets/_app.apps.index-CHwzzoby.js"
	},
	"/assets/_app.configuracoes-DCOzuJtn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"16340-pD33LeLCeesbKUqArOAXJptEV+w\"",
		"mtime": "2026-07-08T20:46:05.870Z",
		"size": 90944,
		"path": "../public/assets/_app.configuracoes-DCOzuJtn.js"
	},
	"/assets/_app.consumo-wz1DHn1T.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2dab-89WeQutpkheU7fPPdoMIYsDHp8A\"",
		"mtime": "2026-07-08T20:46:05.870Z",
		"size": 11691,
		"path": "../public/assets/_app.consumo-wz1DHn1T.js"
	},
	"/assets/_app.conhecimento-BRM8wtG0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"29f0-zHKfcoGl34hKRxi6pO7Qeh04OKg\"",
		"mtime": "2026-07-08T20:46:05.870Z",
		"size": 10736,
		"path": "../public/assets/_app.conhecimento-BRM8wtG0.js"
	},
	"/assets/_app.ferramentas-XyQrJbfz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"452c-BfNAmSwvUdtwue6MtSdQmBZMY1M\"",
		"mtime": "2026-07-08T20:46:05.870Z",
		"size": 17708,
		"path": "../public/assets/_app.ferramentas-XyQrJbfz.js"
	},
	"/assets/_app.index-AnWtjCvg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ef6-XF/gmO3184HTW+/HrPzdkes/v+c\"",
		"mtime": "2026-07-08T20:46:05.871Z",
		"size": 7926,
		"path": "../public/assets/_app.index-AnWtjCvg.js"
	},
	"/assets/_app.implantacao-Bl8Hk4aI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4e18-anMuNls+dVT7Rpz5/cnXMIrqh9s\"",
		"mtime": "2026-07-08T20:46:05.871Z",
		"size": 19992,
		"path": "../public/assets/_app.implantacao-Bl8Hk4aI.js"
	},
	"/assets/_app.memoria-BKQx3FYj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"22c4-OYB674ZS6thefC4bMOJ8lrATzew\"",
		"mtime": "2026-07-08T20:46:05.871Z",
		"size": 8900,
		"path": "../public/assets/_app.memoria-BKQx3FYj.js"
	},
	"/assets/_app.flow-CuzMimd2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3174a-AQ+E9te6uPLtZeuroPTjJ/rn8Nk\"",
		"mtime": "2026-07-08T20:46:05.871Z",
		"size": 202570,
		"path": "../public/assets/_app.flow-CuzMimd2.js"
	},
	"/assets/_app.logs-CsqrGJKG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3a24-BrEnui3F/7FOFtdTrpjsslBSLJ0\"",
		"mtime": "2026-07-08T20:46:05.871Z",
		"size": 14884,
		"path": "../public/assets/_app.logs-CsqrGJKG.js"
	},
	"/assets/_app.testes-kC9wl_tU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f5c1-xZSBg6g3IXARAn/fki0UK8LV7wo\"",
		"mtime": "2026-07-08T20:46:05.871Z",
		"size": 62913,
		"path": "../public/assets/_app.testes-kC9wl_tU.js"
	},
	"/assets/_app.variaveis-Cq4Hdlw8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ebe-tC7J4Cp0FDQByS7Hn0EJk/20LeQ\"",
		"mtime": "2026-07-08T20:46:05.872Z",
		"size": 3774,
		"path": "../public/assets/_app.variaveis-Cq4Hdlw8.js"
	},
	"/assets/apiClient-COWA8JHH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6fa-bwNi4woIsV8ZMA7dh/wp1Ygyvmc\"",
		"mtime": "2026-07-08T20:46:05.872Z",
		"size": 1786,
		"path": "../public/assets/apiClient-COWA8JHH.js"
	},
	"/assets/assistants-C0bs2beM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"181-6y+VxFkPdT1zIj9AbcyfiGEu+4k\"",
		"mtime": "2026-07-08T20:46:05.872Z",
		"size": 385,
		"path": "../public/assets/assistants-C0bs2beM.js"
	},
	"/assets/auth-eKhU0Av6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"244f-hap0gDkBQMtb5H/UowlsBWa6+I8\"",
		"mtime": "2026-07-08T20:46:05.873Z",
		"size": 9295,
		"path": "../public/assets/auth-eKhU0Av6.js"
	},
	"/assets/appStoreService-BgoHKPkD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d43-9MT8cjlMlRNFVjIbtn4yu8W9gcU\"",
		"mtime": "2026-07-08T20:46:05.872Z",
		"size": 3395,
		"path": "../public/assets/appStoreService-BgoHKPkD.js"
	},
	"/assets/arrow-left-DSFoaUID.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9a-EJPXudL/gIi2odMKdABmBz3uGsE\"",
		"mtime": "2026-07-08T20:46:05.872Z",
		"size": 154,
		"path": "../public/assets/arrow-left-DSFoaUID.js"
	},
	"/assets/backendAssistantsService-CbAMR9is.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"555-d7iTTMEKS0O0szPa9epdpkV+ea0\"",
		"mtime": "2026-07-08T20:46:05.873Z",
		"size": 1365,
		"path": "../public/assets/backendAssistantsService-CbAMR9is.js"
	},
	"/assets/badge-CKJcBXs5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3b4-qfkMvJKtmh/icTm1+ZygQba92aw\"",
		"mtime": "2026-07-08T20:46:05.873Z",
		"size": 948,
		"path": "../public/assets/badge-CKJcBXs5.js"
	},
	"/assets/bot-D_zDhE2y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13d-WoUq2LYLE30DacnrYh6BvupVac8\"",
		"mtime": "2026-07-08T20:46:05.873Z",
		"size": 317,
		"path": "../public/assets/bot-D_zDhE2y.js"
	},
	"/assets/braces-DbeA4BPz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10c-xhCAhfd68Rxu+q8XwLPm/Z3yUxQ\"",
		"mtime": "2026-07-08T20:46:05.873Z",
		"size": 268,
		"path": "../public/assets/braces-DbeA4BPz.js"
	},
	"/assets/brain-BpiIUHPk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"318-YC4Xu0Pwq9/uHwIxlQkxc6op64k\"",
		"mtime": "2026-07-08T20:46:05.873Z",
		"size": 792,
		"path": "../public/assets/brain-BpiIUHPk.js"
	},
	"/assets/button-CsnKOT0a.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1127-nw8NH2LoTetz8wFkAf8ZDWiTkI8\"",
		"mtime": "2026-07-08T20:46:05.873Z",
		"size": 4391,
		"path": "../public/assets/button-CsnKOT0a.js"
	},
	"/assets/chevron-right-DV805XC4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"77-swxMKRdlYM++3G97Byok3MxCX2Q\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 119,
		"path": "../public/assets/chevron-right-DV805XC4.js"
	},
	"/assets/card-C0DHEyq-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5e6-Wkwxf2XeQZWdiG5xLi3bOfYpuBU\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 1510,
		"path": "../public/assets/card-C0DHEyq-.js"
	},
	"/assets/building-2-C-k3j_Cs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"174-QmBBBbZvisI2TVyAsrfg8Z5Qu0c\"",
		"mtime": "2026-07-08T20:46:05.873Z",
		"size": 372,
		"path": "../public/assets/building-2-C-k3j_Cs.js"
	},
	"/assets/companiesService-1jsEZYdv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a5-Z9QpIAPh0XdF/83yJ6b0VdnAw8w\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 421,
		"path": "../public/assets/companiesService-1jsEZYdv.js"
	},
	"/assets/circle-check-B__dwSqC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a7-7Kx3023cU+uNvSK4DFzjLoT9bcg\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 167,
		"path": "../public/assets/circle-check-B__dwSqC.js"
	},
	"/assets/copy-D_Q9kA1Q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e1-LDCAWh69QQVDmzXuAm3tpXSfXic\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 225,
		"path": "../public/assets/copy-D_Q9kA1Q.js"
	},
	"/assets/conversations-DicjoLiB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"464-jAelvpCD/4sfXnDFX6q1buefjhg\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 1124,
		"path": "../public/assets/conversations-DicjoLiB.js"
	},
	"/assets/circle-play-Bju42rsN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f5-KcF/hSTE3ZOGCBUqyw/jKKIC0Fs\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 245,
		"path": "../public/assets/circle-play-Bju42rsN.js"
	},
	"/assets/dist-Cixt4XvI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ded-NJ991nsvg6SeFV3SOK3Ewlp7cXM\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 3565,
		"path": "../public/assets/dist-Cixt4XvI.js"
	},
	"/assets/currentCompanyService-Ch7uweml.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a-zpoCq7ipGVOqgflQTf6xz9TnfgM\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 106,
		"path": "../public/assets/currentCompanyService-Ch7uweml.js"
	},
	"/assets/dollar-sign-Bi3vKk0F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d0-89UeJcrq9JSommIM27Yw+O+yfvA\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 208,
		"path": "../public/assets/dollar-sign-Bi3vKk0F.js"
	},
	"/assets/dialog-DWEpAus9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b8c-U2+0I9P47pZXG4W4fXyLUDPgWoA\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 7052,
		"path": "../public/assets/dialog-DWEpAus9.js"
	},
	"/assets/eye-off-D6J4ZxsY.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a3-scz2+1A2potsJymeYwsxZPh6gOE\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 419,
		"path": "../public/assets/eye-off-D6J4ZxsY.js"
	},
	"/assets/eye-CBHxSnaK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f5-oRsgsxas5NKHhYX8yEyQ2oj7dTo\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 245,
		"path": "../public/assets/eye-CBHxSnaK.js"
	},
	"/assets/file-text-CJ_Oed9M.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"176-6jX092J6BKt1Isky2cPi5zhlzC4\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 374,
		"path": "../public/assets/file-text-CJ_Oed9M.js"
	},
	"/assets/globe-nqT0EluG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e7-JwTHYXujUHEezZaNAsgdXB7coT8\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 231,
		"path": "../public/assets/globe-nqT0EluG.js"
	},
	"/assets/index-BJ23EhEw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"58453-Sa6M3ThS9sC3sWv8OnDkLMXVD20\"",
		"mtime": "2026-07-08T20:46:05.867Z",
		"size": 361555,
		"path": "../public/assets/index-BJ23EhEw.js"
	},
	"/assets/dist-DH7nf7cy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1908-FlmEFMyuz1iVbsNIh2HNVq4hs3k\"",
		"mtime": "2026-07-08T20:46:05.874Z",
		"size": 6408,
		"path": "../public/assets/dist-DH7nf7cy.js"
	},
	"/assets/index-DtxX27Jz.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"3c35-GybETsF6L6PuXEMieWyMg/5Dn7o\"",
		"mtime": "2026-07-08T20:46:05.879Z",
		"size": 15413,
		"path": "../public/assets/index-DtxX27Jz.css"
	},
	"/assets/jsx-dev-runtime-CzOWe84K.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fcd-ezW5+Vt37SxP82XRPtbV7kKsgpA\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 8141,
		"path": "../public/assets/jsx-dev-runtime-CzOWe84K.js"
	},
	"/assets/input-DT51Lj2u.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2fb-fZWupdJOPGZ2Ej2JQ2tcZ5NfklU\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 763,
		"path": "../public/assets/input-DT51Lj2u.js"
	},
	"/assets/label-D0Yhzm6m.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"351-nikgxq6UuXR76U1bVWHQ4hgOKnk\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 849,
		"path": "../public/assets/label-D0Yhzm6m.js"
	},
	"/assets/link-2-Cy1ctu32.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e7-k5zlFtT5HA7Zfur8G3N5DRJVAf4\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 231,
		"path": "../public/assets/link-2-Cy1ctu32.js"
	},
	"/assets/link-Bj_eRlye.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5c0e-o4ENKCFBWreQJozphzfusZ1vlnE\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 23566,
		"path": "../public/assets/link-Bj_eRlye.js"
	},
	"/assets/jsx-runtime-ChKoiITb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f52-zHlBHQ7ajzsgMl05n9FvHMqBj78\"",
		"mtime": "2026-07-08T20:46:05.875Z",
		"size": 3922,
		"path": "../public/assets/jsx-runtime-ChKoiITb.js"
	},
	"/assets/loader-circle-JDQOORJT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"85-z3Iz7JPJCgpX5ifrIufV3/dI93k\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 133,
		"path": "../public/assets/loader-circle-JDQOORJT.js"
	},
	"/assets/message-square-BtV8BEo6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"de-pV1wvBmKw6FnB8AfE8s8u4o2C8c\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 222,
		"path": "../public/assets/message-square-BtV8BEo6.js"
	},
	"/assets/mock-CfZwaYsV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b1-nf84QK2MFJVZJmpA3YOmxJYK67U\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 177,
		"path": "../public/assets/mock-CfZwaYsV.js"
	},
	"/assets/pause-Bzfw0HWY.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c8-SnTxS983d8EphTQZH3p6/wSHvz8\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 200,
		"path": "../public/assets/pause-Bzfw0HWY.js"
	},
	"/assets/pencil-BYHF4kZp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"109-a2CczjN5idd8Wf3bW2IfUImSnsM\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 265,
		"path": "../public/assets/pencil-BYHF4kZp.js"
	},
	"/assets/play-jgr7smMl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b3-YNYTnGeVf1JFHtE3YfEX4ODdW+o\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 179,
		"path": "../public/assets/play-jgr7smMl.js"
	},
	"/assets/plus-CR2PSYf4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8e-2vkEMQE/Xxm0Iq1bdlicG6WVfzA\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 142,
		"path": "../public/assets/plus-CR2PSYf4.js"
	},
	"/assets/save-DwrJVSoA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13c-rnKUSgBSCPQBf3uSm3D3Z8S6Hmw\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 316,
		"path": "../public/assets/save-DwrJVSoA.js"
	},
	"/assets/send-CBqYWEqb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"117-zf5CLb1kBYb1t5fVZ2hkRUax6w4\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 279,
		"path": "../public/assets/send-CBqYWEqb.js"
	},
	"/assets/settings-2-yzGW6f1L.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"241-4xTEmipT9gtcvtAuGGPC5E2wfp0\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 577,
		"path": "../public/assets/settings-2-yzGW6f1L.js"
	},
	"/assets/search-C20NltZl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a3-5u70C0QoIc1WWHV2O5vWDKfkmLY\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 163,
		"path": "../public/assets/search-C20NltZl.js"
	},
	"/assets/sparkles-Cq1vnT9Q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e3-ITQ/8I/THaBhHvlSeW09+yhea0c\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 483,
		"path": "../public/assets/sparkles-Cq1vnT9Q.js"
	},
	"/assets/select-CBCrVkJZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5a4a-XohPgO8xeTo7Teq6Cq8ysntoCFo\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 23114,
		"path": "../public/assets/select-CBCrVkJZ.js"
	},
	"/assets/styles-DkgS-I9Z.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"1ad03-9aLjgo3p/Vb4rmw9Abje5SNNL8o\"",
		"mtime": "2026-07-08T20:46:05.879Z",
		"size": 109827,
		"path": "../public/assets/styles-DkgS-I9Z.css"
	},
	"/assets/table-wRmv_GKV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8e9-rPNTYey97QP8Pt9b5ImrtYGfD/M\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 2281,
		"path": "../public/assets/table-wRmv_GKV.js"
	},
	"/assets/refresh-cw-PwdidYCV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"136-vExhDgMPTJ+QptoRc/2a+8/IaMw\"",
		"mtime": "2026-07-08T20:46:05.876Z",
		"size": 310,
		"path": "../public/assets/refresh-cw-PwdidYCV.js"
	},
	"/assets/settings-BUqZ8FRf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dc-y/2JwK7HiMJSK8FsiDyCkLOTeM8\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 476,
		"path": "../public/assets/settings-BUqZ8FRf.js"
	},
	"/assets/switch-Db39XKY7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f4b-VCI8vGx8pLIN7NTOpfKXmHNqJ4M\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 3915,
		"path": "../public/assets/switch-Db39XKY7.js"
	},
	"/assets/tabs-Ak9iTb56.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e68-qP/ThMxb9uQAnCmyR22KXM7JZnY\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 3688,
		"path": "../public/assets/tabs-Ak9iTb56.js"
	},
	"/assets/textarea-C7Fpp5b-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"298-SGu+XX5arLQ37fTWHHyZ2NYJX6c\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 664,
		"path": "../public/assets/textarea-C7Fpp5b-.js"
	},
	"/assets/trash-2-D3h1fVMd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13d-dSK5s6OM4WTcbPyYIKfaITmzlLk\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 317,
		"path": "../public/assets/trash-2-D3h1fVMd.js"
	},
	"/assets/triangle-alert-C7PUfutu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fe-vnLQ0dUlk7nIFsyhJk+rDVRdzws\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 254,
		"path": "../public/assets/triangle-alert-C7PUfutu.js"
	},
	"/assets/tooltip-DHD3QpL0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"792a-0J8j7zjl4OrazBJ+oLQBu6NFEGk\"",
		"mtime": "2026-07-08T20:46:05.877Z",
		"size": 31018,
		"path": "../public/assets/tooltip-DHD3QpL0.js"
	},
	"/assets/useMatch-CyNnaJj4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"536-TJ2La8/eIoBHoZaj8r0ZuMYozQA\"",
		"mtime": "2026-07-08T20:46:05.878Z",
		"size": 1334,
		"path": "../public/assets/useMatch-CyNnaJj4.js"
	},
	"/assets/useRouter-LLse1Au6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b6-Jri9qpk+FXqN8GRbCG0QGoxbsJI\"",
		"mtime": "2026-07-08T20:46:05.878Z",
		"size": 694,
		"path": "../public/assets/useRouter-LLse1Au6.js"
	},
	"/assets/user-check-lybkK6iP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-0TdYWVWbQEix6Qinr/t+dSPBXe8\"",
		"mtime": "2026-07-08T20:46:05.878Z",
		"size": 232,
		"path": "../public/assets/user-check-lybkK6iP.js"
	},
	"/assets/webhook-KBI2yQdu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"155-K82RCYhIH7dK5N4VjnA8UoVzq6g\"",
		"mtime": "2026-07-08T20:46:05.878Z",
		"size": 341,
		"path": "../public/assets/webhook-KBI2yQdu.js"
	},
	"/assets/utils-CXnbtypo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6f46-mxJ9Vt7bsFB9onehv+/YeqOKdyo\"",
		"mtime": "2026-07-08T20:46:05.878Z",
		"size": 28486,
		"path": "../public/assets/utils-CXnbtypo.js"
	},
	"/assets/with-selector-BWf97Tzb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"65e-mepKjpwdPdGtlREp15PxbPALe8k\"",
		"mtime": "2026-07-08T20:46:05.878Z",
		"size": 1630,
		"path": "../public/assets/with-selector-BWf97Tzb.js"
	},
	"/assets/wrench-DmsZ9cTs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d4-4sTQA+pcqgvHyqHBbx0LdahYmj4\"",
		"mtime": "2026-07-08T20:46:05.878Z",
		"size": 468,
		"path": "../public/assets/wrench-DmsZ9cTs.js"
	},
	"/assets/x-dA1pAaHg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8f-/ToDbiijNDftcbdw+omF1jAgSIQ\"",
		"mtime": "2026-07-08T20:46:05.878Z",
		"size": 143,
		"path": "../public/assets/x-dA1pAaHg.js"
	}
};
//#endregion
//#region #nitro/virtual/public-assets-node
function readAsset(id) {
	const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
	return promises.readFile(resolve(serverDir, public_assets_data_default[id].path));
}
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
function getAsset(id) {
	return public_assets_data_default[id];
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/static.mjs
var METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
var EncodingMap = {
	gzip: ".gz",
	br: ".br",
	zstd: ".zst"
};
var static_default = defineHandler((event) => {
	if (event.req.method && !METHODS.has(event.req.method)) return;
	let id = decodePath(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	let asset;
	const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(), ""];
	for (const encoding of encodings) for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
		const _asset = getAsset(_id);
		if (_asset) {
			asset = _asset;
			id = _id;
			break;
		}
	}
	if (!asset) {
		if (isPublicAssetURL(id)) {
			event.res.headers.delete("Cache-Control");
			throw new HTTPError({ status: 404 });
		}
		return;
	}
	if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
	if (event.req.headers.get("if-none-match") === asset.etag) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	const ifModifiedSinceH = event.req.headers.get("if-modified-since");
	const mtimeDate = new Date(asset.mtime);
	if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (asset.type) event.res.headers.set("Content-Type", asset.type);
	if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
	if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
	if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
	if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
	return readAsset(id);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_ht6wBu = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_ht6wBu
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
var globalMiddleware = [toEventHandler(static_default)].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new NodeResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~middleware"].push(...globalMiddleware);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		middleware.push(...h3App["~middleware"]);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/hooks.mjs
function _captureError(error, type) {
	console.error(`[${type}]`, error);
	useNitroApp().captureError?.(error, { tags: [type] });
}
function trapUnhandledErrors() {
	process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
	process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
//#endregion
//#region #nitro/virtual/tracing
var tracingSrvxPlugins = [];
//#endregion
//#region node_modules/nitro/dist/presets/node/runtime/node-server.mjs
var _parsedPort = Number.parseInt(process.env.NITRO_PORT ?? process.env.PORT ?? "");
var port = Number.isNaN(_parsedPort) ? 3e3 : _parsedPort;
var host = process.env.NITRO_HOST || process.env.HOST;
var cert = process.env.NITRO_SSL_CERT;
var key = process.env.NITRO_SSL_KEY;
var nitroApp = useNitroApp();
serve({
	port,
	hostname: host,
	tls: cert && key ? {
		cert,
		key
	} : void 0,
	fetch: nitroApp.fetch,
	plugins: [...tracingSrvxPlugins]
});
trapUnhandledErrors();
var node_server_default = {};
//#endregion
export { node_server_default as default };
