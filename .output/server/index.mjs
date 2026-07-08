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
	"/.DS_Store": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"1804-mXPO60RVjg6jB46Sr+5lGYklUnQ\"",
		"mtime": "2026-07-08T21:24:03.942Z",
		"size": 6148,
		"path": "../public/.DS_Store"
	},
	"/app-icons/.DS_Store": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"1804-5clYIp/qE06I7ZMlIvq+eX/3ozY\"",
		"mtime": "2026-07-08T21:24:03.937Z",
		"size": 6148,
		"path": "../public/app-icons/.DS_Store"
	},
	"/app-icons/asana.svg": {
		"type": "image/svg+xml",
		"etag": "\"3bf-lwC8A4acEtviLVJB1j9c77G2lCs\"",
		"mtime": "2026-07-08T21:24:03.937Z",
		"size": 959,
		"path": "../public/app-icons/asana.svg"
	},
	"/app-icons/chatwoot.svg": {
		"type": "image/svg+xml",
		"etag": "\"12b-IwzCT0TZHN8aETVLpfNgMrSxQ9w\"",
		"mtime": "2026-07-08T21:24:03.938Z",
		"size": 299,
		"path": "../public/app-icons/chatwoot.svg"
	},
	"/app-icons/calendario-do-google.png": {
		"type": "image/png",
		"etag": "\"2759-taoai6DpWI92OBoyFzTOtb8fT1A\"",
		"mtime": "2026-07-08T21:24:03.939Z",
		"size": 10073,
		"path": "../public/app-icons/calendario-do-google.png"
	},
	"/app-icons/Zapier.png": {
		"type": "image/png",
		"etag": "\"547c-p/kK8ggTX4E4MoOtDSBuZIfDmGE\"",
		"mtime": "2026-07-08T21:24:03.937Z",
		"size": 21628,
		"path": "../public/app-icons/Zapier.png"
	},
	"/app-icons/facebook.png": {
		"type": "image/png",
		"etag": "\"215f-7v4cE5CuzIbYoMh3Pwq34Gxr9uc\"",
		"mtime": "2026-07-08T21:24:03.938Z",
		"size": 8543,
		"path": "../public/app-icons/facebook.png"
	},
	"/app-icons/discord.png": {
		"type": "image/png",
		"etag": "\"8600-vVTknYFA7IZN0HAcmVCCx108Hxw\"",
		"mtime": "2026-07-08T21:24:03.938Z",
		"size": 34304,
		"path": "../public/app-icons/discord.png"
	},
	"/app-icons/gmail.png": {
		"type": "image/png",
		"etag": "\"1c63-f4Pxo52D+ggoUnx/Pl3vD5mN0zM\"",
		"mtime": "2026-07-08T21:24:03.939Z",
		"size": 7267,
		"path": "../public/app-icons/gmail.png"
	},
	"/app-icons/facebook-messenger.png": {
		"type": "image/png",
		"etag": "\"38ef-VoVomo92qJ5C1G6MxtDWrZMNIkA\"",
		"mtime": "2026-07-08T21:24:03.938Z",
		"size": 14575,
		"path": "../public/app-icons/facebook-messenger.png"
	},
	"/app-icons/google-calendar.png": {
		"type": "image/png",
		"etag": "\"2759-taoai6DpWI92OBoyFzTOtb8fT1A\"",
		"mtime": "2026-07-08T21:24:03.938Z",
		"size": 10073,
		"path": "../public/app-icons/google-calendar.png"
	},
	"/app-icons/google-docs.png": {
		"type": "image/png",
		"etag": "\"1577-eM7uq4YHnnjUyt4Sa7YZqF7oCmw\"",
		"mtime": "2026-07-08T21:24:03.938Z",
		"size": 5495,
		"path": "../public/app-icons/google-docs.png"
	},
	"/app-icons/google-analytics.png": {
		"type": "image/png",
		"etag": "\"d89-fYiyrm/vi8uX+y187iqDw7010eU\"",
		"mtime": "2026-07-08T21:24:03.938Z",
		"size": 3465,
		"path": "../public/app-icons/google-analytics.png"
	},
	"/app-icons/google-sheets.png": {
		"type": "image/png",
		"etag": "\"48d0-juq8pvQHu440tKTZ66rqcJWR630\"",
		"mtime": "2026-07-08T21:24:03.939Z",
		"size": 18640,
		"path": "../public/app-icons/google-sheets.png"
	},
	"/app-icons/google_docs.png": {
		"type": "image/png",
		"etag": "\"1577-eM7uq4YHnnjUyt4Sa7YZqF7oCmw\"",
		"mtime": "2026-07-08T21:24:03.939Z",
		"size": 5495,
		"path": "../public/app-icons/google_docs.png"
	},
	"/app-icons/google-drive.png": {
		"type": "image/png",
		"etag": "\"4c28-xO47kWModj+RxJLFDC8Pve3+M3s\"",
		"mtime": "2026-07-08T21:24:03.939Z",
		"size": 19496,
		"path": "../public/app-icons/google-drive.png"
	},
	"/app-icons/google_drive.png": {
		"type": "image/png",
		"etag": "\"4c28-xO47kWModj+RxJLFDC8Pve3+M3s\"",
		"mtime": "2026-07-08T21:24:03.939Z",
		"size": 19496,
		"path": "../public/app-icons/google_drive.png"
	},
	"/app-icons/google_sheets.png": {
		"type": "image/png",
		"etag": "\"48d0-juq8pvQHu440tKTZ66rqcJWR630\"",
		"mtime": "2026-07-08T21:24:03.940Z",
		"size": 18640,
		"path": "../public/app-icons/google_sheets.png"
	},
	"/app-icons/ifood.svg": {
		"type": "image/svg+xml",
		"etag": "\"473-1ZTGgXtUytIljEsFCg4WHvmuzMQ\"",
		"mtime": "2026-07-08T21:24:03.939Z",
		"size": 1139,
		"path": "../public/app-icons/ifood.svg"
	},
	"/app-icons/hubspot.png": {
		"type": "image/png",
		"etag": "\"460f-HZPn0onTTSg8Bu8wNEdWv8Hqs1o\"",
		"mtime": "2026-07-08T21:24:03.939Z",
		"size": 17935,
		"path": "../public/app-icons/hubspot.png"
	},
	"/app-icons/google_meunegocio.png": {
		"type": "image/png",
		"etag": "\"49d0-hZP3wy07j7iSKZFZTmL4JRJZW4c\"",
		"mtime": "2026-07-08T21:24:03.940Z",
		"size": 18896,
		"path": "../public/app-icons/google_meunegocio.png"
	},
	"/app-icons/instagram.png": {
		"type": "image/png",
		"etag": "\"793f-SFzfu07jOtno7aqfNQi3J/0g9Gs\"",
		"mtime": "2026-07-08T21:24:03.940Z",
		"size": 31039,
		"path": "../public/app-icons/instagram.png"
	},
	"/app-icons/make.png": {
		"type": "image/png",
		"etag": "\"32fd-/XD5hNRjIs5Z+F6+f5fsDWeo+tY\"",
		"mtime": "2026-07-08T21:24:03.939Z",
		"size": 13053,
		"path": "../public/app-icons/make.png"
	},
	"/app-icons/instagram.svg": {
		"type": "image/svg+xml",
		"etag": "\"f54-bBcsO5J4qM9FiKZ+fBAUrvVThg0\"",
		"mtime": "2026-07-08T21:24:03.939Z",
		"size": 3924,
		"path": "../public/app-icons/instagram.svg"
	},
	"/app-icons/mercado-livre.svg": {
		"type": "image/svg+xml",
		"etag": "\"293f-rXo2dEBdCsV1f8rHqQb1fO5lunU\"",
		"mtime": "2026-07-08T21:24:03.940Z",
		"size": 10559,
		"path": "../public/app-icons/mercado-livre.svg"
	},
	"/app-icons/notion.svg": {
		"type": "image/svg+xml",
		"etag": "\"3e1-xmJ7eJab3hA2yJ/8EX7PdpBhQ/g\"",
		"mtime": "2026-07-08T21:24:03.940Z",
		"size": 993,
		"path": "../public/app-icons/notion.svg"
	},
	"/app-icons/olx.png": {
		"type": "image/png",
		"etag": "\"2cc7-22PEaWfFjEQZGC3qJ5NurCScm/k\"",
		"mtime": "2026-07-08T21:24:03.940Z",
		"size": 11463,
		"path": "../public/app-icons/olx.png"
	},
	"/app-icons/pipedrive.png": {
		"type": "image/png",
		"etag": "\"a8a-DxQzFZSqG1y9X/qNF4u3YVyvOks\"",
		"mtime": "2026-07-08T21:24:03.940Z",
		"size": 2698,
		"path": "../public/app-icons/pipedrive.png"
	},
	"/app-icons/rd-station.png": {
		"type": "image/png",
		"etag": "\"1f40-l/7+4jzW+JiJzg86Tps6MofapMk\"",
		"mtime": "2026-07-08T21:24:03.940Z",
		"size": 8e3,
		"path": "../public/app-icons/rd-station.png"
	},
	"/app-icons/shopee.svg": {
		"type": "image/svg+xml",
		"etag": "\"135c-DH2aaA4xzmuByDxwE65U+Eikgfg\"",
		"mtime": "2026-07-08T21:24:03.941Z",
		"size": 4956,
		"path": "../public/app-icons/shopee.svg"
	},
	"/app-icons/slack.png": {
		"type": "image/png",
		"etag": "\"46a0-yVU56eqGcBVeM4fexe01yVXr52A\"",
		"mtime": "2026-07-08T21:24:03.941Z",
		"size": 18080,
		"path": "../public/app-icons/slack.png"
	},
	"/app-icons/slack-182.svg": {
		"type": "image/svg+xml",
		"etag": "\"5da-Rh43FoQ0GZ8VXcjcsTTkWCZzWAg\"",
		"mtime": "2026-07-08T21:24:03.941Z",
		"size": 1498,
		"path": "../public/app-icons/slack-182.svg"
	},
	"/app-icons/olx-104.svg": {
		"type": "image/svg+xml",
		"etag": "\"444-9dXg28LzZ9BbghuSICI15JPmUCE\"",
		"mtime": "2026-07-08T21:24:03.940Z",
		"size": 1092,
		"path": "../public/app-icons/olx-104.svg"
	},
	"/app-icons/whatsapp.png": {
		"type": "image/png",
		"etag": "\"59d5-atlOLIls4CQU3KOKKJIzxrqdQTU\"",
		"mtime": "2026-07-08T21:24:03.941Z",
		"size": 22997,
		"path": "../public/app-icons/whatsapp.png"
	},
	"/app-icons/webhook.png": {
		"type": "image/png",
		"etag": "\"2b69-cRIS8q7Pjy/6EtbJsd32A3EKX3s\"",
		"mtime": "2026-07-08T21:24:03.941Z",
		"size": 11113,
		"path": "../public/app-icons/webhook.png"
	},
	"/app-icons/trello.png": {
		"type": "image/png",
		"etag": "\"1e24-VJt7y9CiNFH/wWyGo5bmHMrSxfc\"",
		"mtime": "2026-07-08T21:24:03.941Z",
		"size": 7716,
		"path": "../public/app-icons/trello.png"
	},
	"/app-icons/whatsapp.svg": {
		"type": "image/svg+xml",
		"etag": "\"986-JvXUU1i4OukEpQrAYsml9Xpt7XM\"",
		"mtime": "2026-07-08T21:24:03.941Z",
		"size": 2438,
		"path": "../public/app-icons/whatsapp.svg"
	},
	"/assets/MaskedSecretInput-D_kE2hZ-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6aa-uTyH0ANmUSWP3IKw/Rj2n0o1U1A\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 1706,
		"path": "../public/assets/MaskedSecretInput-D_kE2hZ-.js"
	},
	"/app-icons/youtube.svg": {
		"type": "image/svg+xml",
		"etag": "\"291-Qg/BcWkRXUiliTORgKWI94/ldxI\"",
		"mtime": "2026-07-08T21:24:03.941Z",
		"size": 657,
		"path": "../public/app-icons/youtube.svg"
	},
	"/assets/SecurityNotice-D0MzwJV1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"40d-nrM4m3P0AH7bDxjgqczH3cyAqPA\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 1037,
		"path": "../public/assets/SecurityNotice-D0MzwJV1.js"
	},
	"/assets/StatusBadge-BABQsZRB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a64-lm7Spx0u/Z4e8RaRj7N3fer9LLQ\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 2660,
		"path": "../public/assets/StatusBadge-BABQsZRB.js"
	},
	"/assets/_app-DDgjY7Wf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4bfc-v/pK/gRtXrB08LQVCs9lbL2LZuc\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 19452,
		"path": "../public/assets/_app-DDgjY7Wf.js"
	},
	"/assets/_app.agentes.index-DYRwBOjO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"225c-n4kIJBROK/aG7SPHyRC2kbk/DX0\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 8796,
		"path": "../public/assets/_app.agentes.index-DYRwBOjO.js"
	},
	"/assets/_app.apps.google-calendar-c6f4AZLc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bde0-YQujJZT9D00aT2F2dxGwqqgFi4w\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 48608,
		"path": "../public/assets/_app.apps.google-calendar-c6f4AZLc.js"
	},
	"/assets/_app.agentes.novo-vXFQFjfp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1fbc4-wpd2osLUckZeVr1JJWikqdQ0XOE\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 129988,
		"path": "../public/assets/_app.agentes.novo-vXFQFjfp.js"
	},
	"/assets/_app.canais-C8yql4jv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"48d3-loJ4/u7i7JN9952rN22N8VtsHL8\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 18643,
		"path": "../public/assets/_app.canais-C8yql4jv.js"
	},
	"/assets/_app.consumo-DIwvJWO7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2d61-zGToC5WUP6gtLzF/8P7VDBJwxGE\"",
		"mtime": "2026-07-08T21:24:01.914Z",
		"size": 11617,
		"path": "../public/assets/_app.consumo-DIwvJWO7.js"
	},
	"/assets/_app.apps.index-Cr1ur7wj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ba4-2uqaxxSun5YV4GGd6ZQ8whLbcjg\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 19364,
		"path": "../public/assets/_app.apps.index-Cr1ur7wj.js"
	},
	"/assets/_app.configuracoes-ChK9qgk3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4345-dvDb6Y48OaCyEW2AqVbf4bTheow\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 17221,
		"path": "../public/assets/_app.configuracoes-ChK9qgk3.js"
	},
	"/assets/_app.conhecimento-C0tgpcTp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28fc-WqK71K0k/GtCS8mYzR3n9nvXlDg\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 10492,
		"path": "../public/assets/_app.conhecimento-C0tgpcTp.js"
	},
	"/assets/_app.dashboard-DBnIh6pJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e8b-1CpPOQAcKw+fv8l/F+kfJx0GtNg\"",
		"mtime": "2026-07-08T21:24:01.914Z",
		"size": 7819,
		"path": "../public/assets/_app.dashboard-DBnIh6pJ.js"
	},
	"/assets/_app.ferramentas-DZKPAzBu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"443d-Mre9n/5exFABiAhJRgtBDgyUGaY\"",
		"mtime": "2026-07-08T21:24:01.914Z",
		"size": 17469,
		"path": "../public/assets/_app.ferramentas-DZKPAzBu.js"
	},
	"/assets/_app.implantacao-DshwYBH5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4d4f-HjWDPPNBVOep2rOk2zHtbnm4l3A\"",
		"mtime": "2026-07-08T21:24:01.914Z",
		"size": 19791,
		"path": "../public/assets/_app.implantacao-DshwYBH5.js"
	},
	"/assets/_app.logs-BD7dj3sM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"39e3-qu/ZjuK3aTazxFsgWIHVtsumrQw\"",
		"mtime": "2026-07-08T21:24:01.914Z",
		"size": 14819,
		"path": "../public/assets/_app.logs-BD7dj3sM.js"
	},
	"/assets/_app.memoria-Dt6lsQle.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2246-WL6EMhrCFNkFegQjHx2FbIaqy64\"",
		"mtime": "2026-07-08T21:24:01.914Z",
		"size": 8774,
		"path": "../public/assets/_app.memoria-Dt6lsQle.js"
	},
	"/assets/_app.testes-Dk_O0fUU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f48f-DDxa4KG869SanHogGbm90EwrbN0\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 62607,
		"path": "../public/assets/_app.testes-Dk_O0fUU.js"
	},
	"/assets/_app.variaveis-0nSkxeSv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e79-2cweTJGex3GAArNrLPU++vOEybE\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 3705,
		"path": "../public/assets/_app.variaveis-0nSkxeSv.js"
	},
	"/assets/apiClient-COWA8JHH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6fa-bwNi4woIsV8ZMA7dh/wp1Ygyvmc\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 1786,
		"path": "../public/assets/apiClient-COWA8JHH.js"
	},
	"/assets/_app.flow-DiOPzUdN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3179b-6GynJjlJlosLmJJB1zj1My8w2XU\"",
		"mtime": "2026-07-08T21:24:01.914Z",
		"size": 202651,
		"path": "../public/assets/_app.flow-DiOPzUdN.js"
	},
	"/assets/arrow-left-CPJ8uf8v.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a5-dHLwthMdIdIHCt7tua45A4OMUVg\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 165,
		"path": "../public/assets/arrow-left-CPJ8uf8v.js"
	},
	"/assets/auth-BxbAC08x.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"23b6-3ANjU4PkG9BscJphVWCB7CQMLDQ\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 9142,
		"path": "../public/assets/auth-BxbAC08x.js"
	},
	"/assets/backendAssistantsService-CbAMR9is.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"555-d7iTTMEKS0O0szPa9epdpkV+ea0\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 1365,
		"path": "../public/assets/backendAssistantsService-CbAMR9is.js"
	},
	"/assets/appStoreService-BgoHKPkD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d43-9MT8cjlMlRNFVjIbtn4yu8W9gcU\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 3395,
		"path": "../public/assets/appStoreService-BgoHKPkD.js"
	},
	"/assets/bot-DDz_y0zQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"148-u+z/hiHpkHabEfv+9h7yYNabTcA\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 328,
		"path": "../public/assets/bot-DDz_y0zQ.js"
	},
	"/assets/braces-COZouRcs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"117-raTLvE/bKQTSfccoOAv/HE4lDus\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 279,
		"path": "../public/assets/braces-COZouRcs.js"
	},
	"/assets/brain-Ca_tZXxJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"323-ZxNaYIF/770qgJzcK0xRlHx0254\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 803,
		"path": "../public/assets/brain-Ca_tZXxJ.js"
	},
	"/assets/building-2-C9bbghKQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-tFh+OwT3uwuO4ND/66yZK184/W8\"",
		"mtime": "2026-07-08T21:24:01.915Z",
		"size": 383,
		"path": "../public/assets/building-2-C9bbghKQ.js"
	},
	"/assets/button-CcfjbinM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1128-zMG3Avl1HtgWHjXeuiuztLaqE4Y\"",
		"mtime": "2026-07-08T21:24:01.916Z",
		"size": 4392,
		"path": "../public/assets/button-CcfjbinM.js"
	},
	"/assets/chatwootSettingsService-B6BR5ZaC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d8-TsSjrdxd4IWxf5e0V1Yuf6LV6+M\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 472,
		"path": "../public/assets/chatwootSettingsService-B6BR5ZaC.js"
	},
	"/assets/chevron-right-CZjS-FOL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"82-QsE0D4wKS9iI1aKj3xmBl1loIiY\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 130,
		"path": "../public/assets/chevron-right-CZjS-FOL.js"
	},
	"/assets/circle-check-FKc8U_V6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b2-XZWoTxFS4iSfj19nHIVPQmwRfPc\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 178,
		"path": "../public/assets/circle-check-FKc8U_V6.js"
	},
	"/assets/companiesService-1jsEZYdv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a5-Z9QpIAPh0XdF/83yJ6b0VdnAw8w\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 421,
		"path": "../public/assets/companiesService-1jsEZYdv.js"
	},
	"/assets/circle-play-DCt_1F4D.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"100-+6NIsmmE6K+Rr+8OL0NkyK5PVrg\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 256,
		"path": "../public/assets/circle-play-DCt_1F4D.js"
	},
	"/assets/conversations-DicjoLiB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"464-jAelvpCD/4sfXnDFX6q1buefjhg\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 1124,
		"path": "../public/assets/conversations-DicjoLiB.js"
	},
	"/assets/copy-BWQumwdi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ec-U0Uxn2wDA9KxALBSLQ2ZvfmhsHs\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 236,
		"path": "../public/assets/copy-BWQumwdi.js"
	},
	"/assets/currentCompanyService-Ch7uweml.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a-zpoCq7ipGVOqgflQTf6xz9TnfgM\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 106,
		"path": "../public/assets/currentCompanyService-Ch7uweml.js"
	},
	"/assets/createLucideIcon-DywgXok4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2437-1IKQS7eS3DJdejamd8XodAPiYrQ\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 9271,
		"path": "../public/assets/createLucideIcon-DywgXok4.js"
	},
	"/assets/dist-B08gySzx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"dee-zrsisjL+5GVcP4shfIrnh/sNjwg\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 3566,
		"path": "../public/assets/dist-B08gySzx.js"
	},
	"/assets/dist-LxrzzAAR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1904-Aspst9i0/Ewr7FWMvgDeRhEPhqg\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 6404,
		"path": "../public/assets/dist-LxrzzAAR.js"
	},
	"/assets/dialog-BQO6FeC1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b35-iuqpCGOk4OwZq3O8tt/Q7z5wX2Y\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 2869,
		"path": "../public/assets/dialog-BQO6FeC1.js"
	},
	"/assets/dollar-sign-DqbSNfuO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"db-1zeBX+Gsj1Rbu5r62xtViM48Nv0\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 219,
		"path": "../public/assets/dollar-sign-DqbSNfuO.js"
	},
	"/assets/eye-BleCar1m.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"100-6zG5EN3ItwCIlyWYQQwmbD83NTw\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 256,
		"path": "../public/assets/eye-BleCar1m.js"
	},
	"/assets/eye-off-CxEJ2uLz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ae-XGVWQp0wbQ+HVknDMtthBNNZxTw\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 430,
		"path": "../public/assets/eye-off-CxEJ2uLz.js"
	},
	"/assets/file-text-Jfu7dDX4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"181-IXNZpTTJtyhcVEZBG5O3didFxzU\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 385,
		"path": "../public/assets/file-text-Jfu7dDX4.js"
	},
	"/assets/dist-BxF7nyuy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"beaf-3FCeeM8WEOPk1sHiquTGmwWQewQ\"",
		"mtime": "2026-07-08T21:24:01.917Z",
		"size": 48815,
		"path": "../public/assets/dist-BxF7nyuy.js"
	},
	"/assets/index-Cm3fdUIL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62804-W4SgW9RtCi+7xkObgOYQhCrzQ+U\"",
		"mtime": "2026-07-08T21:24:01.913Z",
		"size": 403460,
		"path": "../public/assets/index-Cm3fdUIL.js"
	},
	"/assets/jsx-runtime-DTMSM_Xs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f53-6R8qbIIpe4h0Cs/oPVqqGE5JuqI\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 3923,
		"path": "../public/assets/jsx-runtime-DTMSM_Xs.js"
	},
	"/assets/link-2-zlMaZLzl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f2-dr1AsDcBAw7NfcaL8S6Y+V3nZMA\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 242,
		"path": "../public/assets/link-2-zlMaZLzl.js"
	},
	"/assets/link-Dk_PRq2c.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5c0f-pMjyoPxWwcYVGCsTSwkw9lbkMuE\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 23567,
		"path": "../public/assets/link-Dk_PRq2c.js"
	},
	"/assets/message-square-npi41qXO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9-b1qg5PrXb5EN1bpedcdiQtIYURs\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 233,
		"path": "../public/assets/message-square-npi41qXO.js"
	},
	"/assets/index-DtxX27Jz.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"3c35-GybETsF6L6PuXEMieWyMg/5Dn7o\"",
		"mtime": "2026-07-08T21:24:01.920Z",
		"size": 15413,
		"path": "../public/assets/index-DtxX27Jz.css"
	},
	"/assets/mock-CtkPm1d-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a3-ijgevr8PN2B+8UUkQwlQ3Fw9Q2g\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 163,
		"path": "../public/assets/mock-CtkPm1d-.js"
	},
	"/assets/pause-lJslDJ7O.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d3-TmrS0PXNzEkeZPk3RWK/Vhom9+s\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 211,
		"path": "../public/assets/pause-lJslDJ7O.js"
	},
	"/assets/play-CRqnaONd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"be-zw28yuxf6Xv3U3iYpaJgK9RDokY\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 190,
		"path": "../public/assets/play-CRqnaONd.js"
	},
	"/assets/plus-C1C-jpSi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-MJRpHmjifGItzjxa79/f9DJUIKY\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 153,
		"path": "../public/assets/plus-C1C-jpSi.js"
	},
	"/assets/portal-BbjIUE_I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3c05-n5ULMJ9GteXDAAnyg9nkcqBBlfI\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 15365,
		"path": "../public/assets/portal-BbjIUE_I.js"
	},
	"/assets/radio-BTO-IUkd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"176-hAEBhy0nk2cCkZRRKP9QjeCE6jk\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 374,
		"path": "../public/assets/radio-BTO-IUkd.js"
	},
	"/assets/refresh-cw-CjdFUFqS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"141-l8uw11jI9VwP2GntaN7ZmmR0v28\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 321,
		"path": "../public/assets/refresh-cw-CjdFUFqS.js"
	},
	"/assets/pencil-BnkTgR0I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"114-Fn6Mb/6hzAAPkOt0kc39H3coyHw\"",
		"mtime": "2026-07-08T21:24:01.918Z",
		"size": 276,
		"path": "../public/assets/pencil-BnkTgR0I.js"
	},
	"/assets/routes-D6rmYDhg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"29c-I0LoC97cD4WNJVDE0EMry0E1x0A\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 668,
		"path": "../public/assets/routes-D6rmYDhg.js"
	},
	"/assets/save-C8GSNlDt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"147-SKGA8TAK3jV6l7vzZtzaserDHd0\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 327,
		"path": "../public/assets/save-C8GSNlDt.js"
	},
	"/assets/search-C6ahAHGB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ae-W5KnvcLZenNW47bUMwKU7eKaWpw\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 174,
		"path": "../public/assets/search-C6ahAHGB.js"
	},
	"/assets/sparkles-BuDRn1EZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ee-jhxuR+f6OjUztOIdB7tNCNZHUu4\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 494,
		"path": "../public/assets/sparkles-BuDRn1EZ.js"
	},
	"/assets/table-BukJ8Vg5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8ea-2eFSQ20/+hmT5gVBV4PubEH3pxY\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 2282,
		"path": "../public/assets/table-BukJ8Vg5.js"
	},
	"/assets/send-ehGWcLoC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"122-zEMHUMJjcKEWCrViEsBKdthec/Y\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 290,
		"path": "../public/assets/send-ehGWcLoC.js"
	},
	"/assets/settings-NnctSg7K.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e7-woxV8BN34sdOeqQjbqzuYMORh9o\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 487,
		"path": "../public/assets/settings-NnctSg7K.js"
	},
	"/assets/tabs-DYvhi6sn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e64-wbc9OYe4YTEM7kVRYqnlgOPMUDs\"",
		"mtime": "2026-07-08T21:24:01.919Z",
		"size": 3684,
		"path": "../public/assets/tabs-DYvhi6sn.js"
	},
	"/assets/trash-2-CTrqgv5V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"148-FLdYKLrKhzN1P7ZeVEkDusnZfgA\"",
		"mtime": "2026-07-08T21:24:01.920Z",
		"size": 328,
		"path": "../public/assets/trash-2-CTrqgv5V.js"
	},
	"/assets/useMatch-C_F32MqB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"537-F2mUSE6LNUKbn2/w4sH4JbzlyCg\"",
		"mtime": "2026-07-08T21:24:01.920Z",
		"size": 1335,
		"path": "../public/assets/useMatch-C_F32MqB.js"
	},
	"/assets/tooltip-CD_5XD_m.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7924-vOhP4NckOUxSwZzmu3nTOATSxAA\"",
		"mtime": "2026-07-08T21:24:01.920Z",
		"size": 31012,
		"path": "../public/assets/tooltip-CD_5XD_m.js"
	},
	"/assets/styles-jIFlUmt1.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"1b651-HOUXFMaZx9TTWhR3/3/A5IuFzpI\"",
		"mtime": "2026-07-08T21:24:01.920Z",
		"size": 112209,
		"path": "../public/assets/styles-jIFlUmt1.css"
	},
	"/assets/useRouter-kdqYxofw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b7-Nhqp5EGrM10iflVAKWvaegwzltc\"",
		"mtime": "2026-07-08T21:24:01.920Z",
		"size": 695,
		"path": "../public/assets/useRouter-kdqYxofw.js"
	},
	"/assets/user-check-lMpyQNor.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f3-+4mFex88xxdgyg5AhK3OI3MMhr0\"",
		"mtime": "2026-07-08T21:24:01.920Z",
		"size": 243,
		"path": "../public/assets/user-check-lMpyQNor.js"
	},
	"/assets/with-selector-jqZcrNPz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"65f-Pt3TKfWI3PiTD5DpqBLFQpQu394\"",
		"mtime": "2026-07-08T21:24:01.920Z",
		"size": 1631,
		"path": "../public/assets/with-selector-jqZcrNPz.js"
	},
	"/assets/utils-B6KiDbIe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a7d-iNkBSvaSyIjvZOzWoTvEa49qwcI\"",
		"mtime": "2026-07-08T21:24:01.920Z",
		"size": 27261,
		"path": "../public/assets/utils-B6KiDbIe.js"
	},
	"/assets/wrench-DClYWUvn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1df-ok2EpdMnHI8DfYsutwE/B512xlk\"",
		"mtime": "2026-07-08T21:24:01.920Z",
		"size": 479,
		"path": "../public/assets/wrench-DClYWUvn.js"
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
