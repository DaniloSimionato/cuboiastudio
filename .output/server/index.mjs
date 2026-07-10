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
		"mtime": "2026-07-10T14:46:14.120Z",
		"size": 6148,
		"path": "../public/.DS_Store"
	},
	"/app-icons/Zapier.png": {
		"type": "image/png",
		"etag": "\"547c-p/kK8ggTX4E4MoOtDSBuZIfDmGE\"",
		"mtime": "2026-07-10T14:46:14.114Z",
		"size": 21628,
		"path": "../public/app-icons/Zapier.png"
	},
	"/app-icons/.DS_Store": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"1804-5clYIp/qE06I7ZMlIvq+eX/3ozY\"",
		"mtime": "2026-07-10T14:46:14.114Z",
		"size": 6148,
		"path": "../public/app-icons/.DS_Store"
	},
	"/app-icons/chatwoot.svg": {
		"type": "image/svg+xml",
		"etag": "\"12b-IwzCT0TZHN8aETVLpfNgMrSxQ9w\"",
		"mtime": "2026-07-10T14:46:14.114Z",
		"size": 299,
		"path": "../public/app-icons/chatwoot.svg"
	},
	"/app-icons/discord.png": {
		"type": "image/png",
		"etag": "\"8600-vVTknYFA7IZN0HAcmVCCx108Hxw\"",
		"mtime": "2026-07-10T14:46:14.114Z",
		"size": 34304,
		"path": "../public/app-icons/discord.png"
	},
	"/app-icons/facebook-messenger.png": {
		"type": "image/png",
		"etag": "\"38ef-VoVomo92qJ5C1G6MxtDWrZMNIkA\"",
		"mtime": "2026-07-10T14:46:14.114Z",
		"size": 14575,
		"path": "../public/app-icons/facebook-messenger.png"
	},
	"/app-icons/facebook.png": {
		"type": "image/png",
		"etag": "\"215f-7v4cE5CuzIbYoMh3Pwq34Gxr9uc\"",
		"mtime": "2026-07-10T14:46:14.117Z",
		"size": 8543,
		"path": "../public/app-icons/facebook.png"
	},
	"/app-icons/calendario-do-google.png": {
		"type": "image/png",
		"etag": "\"2759-taoai6DpWI92OBoyFzTOtb8fT1A\"",
		"mtime": "2026-07-10T14:46:14.114Z",
		"size": 10073,
		"path": "../public/app-icons/calendario-do-google.png"
	},
	"/app-icons/google-calendar.png": {
		"type": "image/png",
		"etag": "\"2759-taoai6DpWI92OBoyFzTOtb8fT1A\"",
		"mtime": "2026-07-10T14:46:14.115Z",
		"size": 10073,
		"path": "../public/app-icons/google-calendar.png"
	},
	"/app-icons/asana.svg": {
		"type": "image/svg+xml",
		"etag": "\"3bf-lwC8A4acEtviLVJB1j9c77G2lCs\"",
		"mtime": "2026-07-10T14:46:14.114Z",
		"size": 959,
		"path": "../public/app-icons/asana.svg"
	},
	"/app-icons/google-docs.png": {
		"type": "image/png",
		"etag": "\"1577-eM7uq4YHnnjUyt4Sa7YZqF7oCmw\"",
		"mtime": "2026-07-10T14:46:14.115Z",
		"size": 5495,
		"path": "../public/app-icons/google-docs.png"
	},
	"/app-icons/gmail.png": {
		"type": "image/png",
		"etag": "\"1c63-f4Pxo52D+ggoUnx/Pl3vD5mN0zM\"",
		"mtime": "2026-07-10T14:46:14.116Z",
		"size": 7267,
		"path": "../public/app-icons/gmail.png"
	},
	"/app-icons/google-analytics.png": {
		"type": "image/png",
		"etag": "\"d89-fYiyrm/vi8uX+y187iqDw7010eU\"",
		"mtime": "2026-07-10T14:46:14.118Z",
		"size": 3465,
		"path": "../public/app-icons/google-analytics.png"
	},
	"/app-icons/google-sheets.png": {
		"type": "image/png",
		"etag": "\"48d0-juq8pvQHu440tKTZ66rqcJWR630\"",
		"mtime": "2026-07-10T14:46:14.116Z",
		"size": 18640,
		"path": "../public/app-icons/google-sheets.png"
	},
	"/app-icons/google_docs.png": {
		"type": "image/png",
		"etag": "\"1577-eM7uq4YHnnjUyt4Sa7YZqF7oCmw\"",
		"mtime": "2026-07-10T14:46:14.117Z",
		"size": 5495,
		"path": "../public/app-icons/google_docs.png"
	},
	"/app-icons/google-drive.png": {
		"type": "image/png",
		"etag": "\"4c28-xO47kWModj+RxJLFDC8Pve3+M3s\"",
		"mtime": "2026-07-10T14:46:14.116Z",
		"size": 19496,
		"path": "../public/app-icons/google-drive.png"
	},
	"/app-icons/google_sheets.png": {
		"type": "image/png",
		"etag": "\"48d0-juq8pvQHu440tKTZ66rqcJWR630\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 18640,
		"path": "../public/app-icons/google_sheets.png"
	},
	"/app-icons/google_meunegocio.png": {
		"type": "image/png",
		"etag": "\"49d0-hZP3wy07j7iSKZFZTmL4JRJZW4c\"",
		"mtime": "2026-07-10T14:46:14.118Z",
		"size": 18896,
		"path": "../public/app-icons/google_meunegocio.png"
	},
	"/app-icons/google_drive.png": {
		"type": "image/png",
		"etag": "\"4c28-xO47kWModj+RxJLFDC8Pve3+M3s\"",
		"mtime": "2026-07-10T14:46:14.118Z",
		"size": 19496,
		"path": "../public/app-icons/google_drive.png"
	},
	"/app-icons/ifood.svg": {
		"type": "image/svg+xml",
		"etag": "\"473-1ZTGgXtUytIljEsFCg4WHvmuzMQ\"",
		"mtime": "2026-07-10T14:46:14.118Z",
		"size": 1139,
		"path": "../public/app-icons/ifood.svg"
	},
	"/app-icons/hubspot.png": {
		"type": "image/png",
		"etag": "\"460f-HZPn0onTTSg8Bu8wNEdWv8Hqs1o\"",
		"mtime": "2026-07-10T14:46:14.118Z",
		"size": 17935,
		"path": "../public/app-icons/hubspot.png"
	},
	"/app-icons/make.png": {
		"type": "image/png",
		"etag": "\"32fd-/XD5hNRjIs5Z+F6+f5fsDWeo+tY\"",
		"mtime": "2026-07-10T14:46:14.118Z",
		"size": 13053,
		"path": "../public/app-icons/make.png"
	},
	"/app-icons/mercado-livre.svg": {
		"type": "image/svg+xml",
		"etag": "\"293f-rXo2dEBdCsV1f8rHqQb1fO5lunU\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 10559,
		"path": "../public/app-icons/mercado-livre.svg"
	},
	"/app-icons/instagram.svg": {
		"type": "image/svg+xml",
		"etag": "\"f54-bBcsO5J4qM9FiKZ+fBAUrvVThg0\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 3924,
		"path": "../public/app-icons/instagram.svg"
	},
	"/app-icons/instagram.png": {
		"type": "image/png",
		"etag": "\"793f-SFzfu07jOtno7aqfNQi3J/0g9Gs\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 31039,
		"path": "../public/app-icons/instagram.png"
	},
	"/app-icons/notion.svg": {
		"type": "image/svg+xml",
		"etag": "\"3e1-xmJ7eJab3hA2yJ/8EX7PdpBhQ/g\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 993,
		"path": "../public/app-icons/notion.svg"
	},
	"/app-icons/olx.png": {
		"type": "image/png",
		"etag": "\"2cc7-22PEaWfFjEQZGC3qJ5NurCScm/k\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 11463,
		"path": "../public/app-icons/olx.png"
	},
	"/app-icons/rd-station.png": {
		"type": "image/png",
		"etag": "\"1f40-l/7+4jzW+JiJzg86Tps6MofapMk\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 8e3,
		"path": "../public/app-icons/rd-station.png"
	},
	"/app-icons/pipedrive.png": {
		"type": "image/png",
		"etag": "\"a8a-DxQzFZSqG1y9X/qNF4u3YVyvOks\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 2698,
		"path": "../public/app-icons/pipedrive.png"
	},
	"/app-icons/slack-182.svg": {
		"type": "image/svg+xml",
		"etag": "\"5da-Rh43FoQ0GZ8VXcjcsTTkWCZzWAg\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 1498,
		"path": "../public/app-icons/slack-182.svg"
	},
	"/app-icons/olx-104.svg": {
		"type": "image/svg+xml",
		"etag": "\"444-9dXg28LzZ9BbghuSICI15JPmUCE\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 1092,
		"path": "../public/app-icons/olx-104.svg"
	},
	"/app-icons/shopee.svg": {
		"type": "image/svg+xml",
		"etag": "\"135c-DH2aaA4xzmuByDxwE65U+Eikgfg\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 4956,
		"path": "../public/app-icons/shopee.svg"
	},
	"/app-icons/trello.png": {
		"type": "image/png",
		"etag": "\"1e24-VJt7y9CiNFH/wWyGo5bmHMrSxfc\"",
		"mtime": "2026-07-10T14:46:14.119Z",
		"size": 7716,
		"path": "../public/app-icons/trello.png"
	},
	"/app-icons/slack.png": {
		"type": "image/png",
		"etag": "\"46a0-yVU56eqGcBVeM4fexe01yVXr52A\"",
		"mtime": "2026-07-10T14:46:14.114Z",
		"size": 18080,
		"path": "../public/app-icons/slack.png"
	},
	"/app-icons/youtube.svg": {
		"type": "image/svg+xml",
		"etag": "\"291-Qg/BcWkRXUiliTORgKWI94/ldxI\"",
		"mtime": "2026-07-10T14:46:14.120Z",
		"size": 657,
		"path": "../public/app-icons/youtube.svg"
	},
	"/app-icons/whatsapp.png": {
		"type": "image/png",
		"etag": "\"59d5-atlOLIls4CQU3KOKKJIzxrqdQTU\"",
		"mtime": "2026-07-10T14:46:14.114Z",
		"size": 22997,
		"path": "../public/app-icons/whatsapp.png"
	},
	"/assets/SecurityNotice-Bw5B_dDb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"944-hiDtmjhgcFGtksE/b2cmG6CdszI\"",
		"mtime": "2026-07-10T14:46:12.789Z",
		"size": 2372,
		"path": "../public/assets/SecurityNotice-Bw5B_dDb.js"
	},
	"/app-icons/webhook.png": {
		"type": "image/png",
		"etag": "\"2b69-cRIS8q7Pjy/6EtbJsd32A3EKX3s\"",
		"mtime": "2026-07-10T14:46:14.120Z",
		"size": 11113,
		"path": "../public/app-icons/webhook.png"
	},
	"/assets/_app.agentes.index-DqLK_tIn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"225c-ukMPN415u8gukyQT7AqTn7CW7ko\"",
		"mtime": "2026-07-10T14:46:12.789Z",
		"size": 8796,
		"path": "../public/assets/_app.agentes.index-DqLK_tIn.js"
	},
	"/assets/_app-BZ16q5AL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4d43-4Hbv9PCSKZAkIrK70HLE7e5Wdv0\"",
		"mtime": "2026-07-10T14:46:12.789Z",
		"size": 19779,
		"path": "../public/assets/_app-BZ16q5AL.js"
	},
	"/assets/_app.agentes.novo-BoLkrQW3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2607c-wWI122Lc/tdZIakCZ/wPi3rLuPk\"",
		"mtime": "2026-07-10T14:46:12.789Z",
		"size": 155772,
		"path": "../public/assets/_app.agentes.novo-BoLkrQW3.js"
	},
	"/assets/_app.apps.index-BhCWiGS5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4eaa-x4xXc5z8PEHQgqZUkl2xIXA7ZE4\"",
		"mtime": "2026-07-10T14:46:12.791Z",
		"size": 20138,
		"path": "../public/assets/_app.apps.index-BhCWiGS5.js"
	},
	"/assets/_app.apps.google-calendar-BJMflmTa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bd99-pKEmfKoB7u1Gg2c+X5hsV7jXDpo\"",
		"mtime": "2026-07-10T14:46:12.790Z",
		"size": 48537,
		"path": "../public/assets/_app.apps.google-calendar-BJMflmTa.js"
	},
	"/assets/StatusBadge-BAfCxrUq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a6b-S7M1FFFmTrQ2kB7noMh4C+DycO0\"",
		"mtime": "2026-07-10T14:46:12.789Z",
		"size": 2667,
		"path": "../public/assets/StatusBadge-BAfCxrUq.js"
	},
	"/assets/_app.configuracoes-Cd_uJypP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4340-dNOIxj0cgh7TLHvA1Lf2dg+kj3A\"",
		"mtime": "2026-07-10T14:46:12.791Z",
		"size": 17216,
		"path": "../public/assets/_app.configuracoes-Cd_uJypP.js"
	},
	"/assets/_app.conhecimento-DZ--U4_F.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28fc-BU1fL7m/89l46pv9DX31J5GC4Co\"",
		"mtime": "2026-07-10T14:46:12.791Z",
		"size": 10492,
		"path": "../public/assets/_app.conhecimento-DZ--U4_F.js"
	},
	"/assets/_app.consumo-Dgchg8fb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2d61-WM8gEV35G5/8UozGtd2Y9hbee/c\"",
		"mtime": "2026-07-10T14:46:12.791Z",
		"size": 11617,
		"path": "../public/assets/_app.consumo-Dgchg8fb.js"
	},
	"/app-icons/whatsapp.svg": {
		"type": "image/svg+xml",
		"etag": "\"986-JvXUU1i4OukEpQrAYsml9Xpt7XM\"",
		"mtime": "2026-07-10T14:46:14.120Z",
		"size": 2438,
		"path": "../public/app-icons/whatsapp.svg"
	},
	"/assets/_app.canais-BKzyxdR2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"701a-J92V924K0yv3cdUhTOTXkhSTXpo\"",
		"mtime": "2026-07-10T14:46:12.791Z",
		"size": 28698,
		"path": "../public/assets/_app.canais-BKzyxdR2.js"
	},
	"/assets/_app.apps.custom-webhook-DJZemNmu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5fc0-K62zO4ZNZxc24o6yJA0V1EqLuWg\"",
		"mtime": "2026-07-10T14:46:12.790Z",
		"size": 24512,
		"path": "../public/assets/_app.apps.custom-webhook-DJZemNmu.js"
	},
	"/assets/_app.dashboard-2XvAJQjs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e8b-lgMtkWOLgXG3u2LZocVG5POsyN4\"",
		"mtime": "2026-07-10T14:46:12.791Z",
		"size": 7819,
		"path": "../public/assets/_app.dashboard-2XvAJQjs.js"
	},
	"/assets/_app.ferramentas-DI-T0GIS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4228-XLqYFUx5ErfU9bSiI5OU2k+QiUk\"",
		"mtime": "2026-07-10T14:46:12.791Z",
		"size": 16936,
		"path": "../public/assets/_app.ferramentas-DI-T0GIS.js"
	},
	"/assets/_app.implantacao-f_fZwxMu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4d75-7mMZpRX+xCDFPFHtgEPCRNBcgQk\"",
		"mtime": "2026-07-10T14:46:12.792Z",
		"size": 19829,
		"path": "../public/assets/_app.implantacao-f_fZwxMu.js"
	},
	"/assets/_app.logs-ULSX-vDQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"39e3-Z5IL0AUMMi6ggAOmpdQYXD+pScc\"",
		"mtime": "2026-07-10T14:46:12.792Z",
		"size": 14819,
		"path": "../public/assets/_app.logs-ULSX-vDQ.js"
	},
	"/assets/_app.memoria-B7Z82kox.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"226a-Dby1dX0h77Ho8NdMI0gg/ZAcFmE\"",
		"mtime": "2026-07-10T14:46:12.793Z",
		"size": 8810,
		"path": "../public/assets/_app.memoria-B7Z82kox.js"
	},
	"/assets/_app.variaveis-D4jWqSae.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e79-LPULamhX4xdnCTWY6qM0l6Q7D0o\"",
		"mtime": "2026-07-10T14:46:12.793Z",
		"size": 3705,
		"path": "../public/assets/_app.variaveis-D4jWqSae.js"
	},
	"/assets/apiClient-CIYxb1Ie.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"80f-SrVWAxVmqlmT3gfSR9uftzOaH5E\"",
		"mtime": "2026-07-10T14:46:12.793Z",
		"size": 2063,
		"path": "../public/assets/apiClient-CIYxb1Ie.js"
	},
	"/assets/_app.testes-CYIx90il.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f472-8eM5OsOwAVaSht7d51vI/kaz3AQ\"",
		"mtime": "2026-07-10T14:46:12.793Z",
		"size": 62578,
		"path": "../public/assets/_app.testes-CYIx90il.js"
	},
	"/assets/_app.flow-4yCVoe-a.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"316f1-nxAyf16+SUOsB1zP0JOXYyVfFwg\"",
		"mtime": "2026-07-10T14:46:12.791Z",
		"size": 202481,
		"path": "../public/assets/_app.flow-4yCVoe-a.js"
	},
	"/assets/appStoreService-DWY1T0LM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d43-21t3v3Z1V1vWXIm/drsf2U9yqv4\"",
		"mtime": "2026-07-10T14:46:12.793Z",
		"size": 3395,
		"path": "../public/assets/appStoreService-DWY1T0LM.js"
	},
	"/assets/arrow-left-CPJ8uf8v.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a5-dHLwthMdIdIHCt7tua45A4OMUVg\"",
		"mtime": "2026-07-10T14:46:12.793Z",
		"size": 165,
		"path": "../public/assets/arrow-left-CPJ8uf8v.js"
	},
	"/assets/arrow-right-BfESIfXp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a5-A1HExYz9xHF09R+c9+6pgH4IvWs\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 165,
		"path": "../public/assets/arrow-right-BfESIfXp.js"
	},
	"/assets/auth-DMe3DyKN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bdb-Qyeifa+o6hOHw8+160s7lIVGVkM\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 3035,
		"path": "../public/assets/auth-DMe3DyKN.js"
	},
	"/assets/backendAssistantsService-BEX4fz_r.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"799-fi97jp1nAc9h7bPKHBCF0TA/Vmg\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 1945,
		"path": "../public/assets/backendAssistantsService-BEX4fz_r.js"
	},
	"/assets/book-open-B12KLvRs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"117-taR69OXh5Fsxn8kbHQmUelDu540\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 279,
		"path": "../public/assets/book-open-B12KLvRs.js"
	},
	"/assets/bot-DDz_y0zQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"148-u+z/hiHpkHabEfv+9h7yYNabTcA\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 328,
		"path": "../public/assets/bot-DDz_y0zQ.js"
	},
	"/assets/braces-COZouRcs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"117-raTLvE/bKQTSfccoOAv/HE4lDus\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 279,
		"path": "../public/assets/braces-COZouRcs.js"
	},
	"/assets/brain-Bk2qBbfw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"241-NqFkPR/hga9JzskoXBSGOAFWaQQ\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 577,
		"path": "../public/assets/brain-Bk2qBbfw.js"
	},
	"/assets/building-2-C9bbghKQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-tFh+OwT3uwuO4ND/66yZK184/W8\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 383,
		"path": "../public/assets/building-2-C9bbghKQ.js"
	},
	"/assets/button-CcfjbinM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1128-zMG3Avl1HtgWHjXeuiuztLaqE4Y\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 4392,
		"path": "../public/assets/button-CcfjbinM.js"
	},
	"/assets/chatwootSettingsService-FPJP96lg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"212-w2vYNa23yUrOEbgqZ6/lEQdeX90\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 530,
		"path": "../public/assets/chatwootSettingsService-FPJP96lg.js"
	},
	"/assets/chevron-right-CZjS-FOL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"82-QsE0D4wKS9iI1aKj3xmBl1loIiY\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 130,
		"path": "../public/assets/chevron-right-CZjS-FOL.js"
	},
	"/assets/circle-DXndRQnW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"82-Bl5GrYYXNLJ6jFp9U0troY0Zq9U\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 130,
		"path": "../public/assets/circle-DXndRQnW.js"
	},
	"/assets/circle-check-FKc8U_V6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b2-XZWoTxFS4iSfj19nHIVPQmwRfPc\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 178,
		"path": "../public/assets/circle-check-FKc8U_V6.js"
	},
	"/assets/circle-play-DCt_1F4D.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"100-+6NIsmmE6K+Rr+8OL0NkyK5PVrg\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 256,
		"path": "../public/assets/circle-play-DCt_1F4D.js"
	},
	"/assets/companiesService-CWNJHCg9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c3-jdBwtg7mRu9dTbmNQQlmVYMIe7w\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 707,
		"path": "../public/assets/companiesService-CWNJHCg9.js"
	},
	"/assets/conversations-DicjoLiB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"464-jAelvpCD/4sfXnDFX6q1buefjhg\"",
		"mtime": "2026-07-10T14:46:12.794Z",
		"size": 1124,
		"path": "../public/assets/conversations-DicjoLiB.js"
	},
	"/assets/copy-BWQumwdi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ec-U0Uxn2wDA9KxALBSLQ2ZvfmhsHs\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 236,
		"path": "../public/assets/copy-BWQumwdi.js"
	},
	"/assets/currentCompanyService-C70yEu2I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a-/b/L9AAHevJVlZmgycSUVMdzZMU\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 106,
		"path": "../public/assets/currentCompanyService-C70yEu2I.js"
	},
	"/assets/createLucideIcon-DywgXok4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2437-1IKQS7eS3DJdejamd8XodAPiYrQ\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 9271,
		"path": "../public/assets/createLucideIcon-DywgXok4.js"
	},
	"/assets/dialog-CeVZWQuS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b35-SkXO+vjx72gxYJEXdboSE29ETCg\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 2869,
		"path": "../public/assets/dialog-CeVZWQuS.js"
	},
	"/assets/dollar-sign-DqbSNfuO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"db-1zeBX+Gsj1Rbu5r62xtViM48Nv0\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 219,
		"path": "../public/assets/dollar-sign-DqbSNfuO.js"
	},
	"/assets/dist-CtAZ9kc5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"dee-FtkFZ+WkplX4KXYMvjnFS/HAir8\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 3566,
		"path": "../public/assets/dist-CtAZ9kc5.js"
	},
	"/assets/dist-Cxqx0WAi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d6f1-k/TZharX5Gpj/4MJNmBBANxiIh4\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 55025,
		"path": "../public/assets/dist-Cxqx0WAi.js"
	},
	"/assets/eye-BleCar1m.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"100-6zG5EN3ItwCIlyWYQQwmbD83NTw\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 256,
		"path": "../public/assets/eye-BleCar1m.js"
	},
	"/assets/eye-off-CxEJ2uLz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ae-XGVWQp0wbQ+HVknDMtthBNNZxTw\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 430,
		"path": "../public/assets/eye-off-CxEJ2uLz.js"
	},
	"/assets/dropdown-menu-CC57lF4c.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5899-jgTSlZ9LtzLXoOIPrhjt6H4bw94\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 22681,
		"path": "../public/assets/dropdown-menu-CC57lF4c.js"
	},
	"/assets/file-text-Jfu7dDX4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"181-IXNZpTTJtyhcVEZBG5O3didFxzU\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 385,
		"path": "../public/assets/file-text-Jfu7dDX4.js"
	},
	"/assets/git-branch-Dy49n1hs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e5-4vKiLdRXfFhEuVKI/etXvLB1vNI\"",
		"mtime": "2026-07-10T14:46:12.795Z",
		"size": 229,
		"path": "../public/assets/git-branch-Dy49n1hs.js"
	},
	"/assets/index-DtxX27Jz.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"3c35-GybETsF6L6PuXEMieWyMg/5Dn7o\"",
		"mtime": "2026-07-10T14:46:12.799Z",
		"size": 15413,
		"path": "../public/assets/index-DtxX27Jz.css"
	},
	"/assets/link-2-zlMaZLzl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f2-dr1AsDcBAw7NfcaL8S6Y+V3nZMA\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 242,
		"path": "../public/assets/link-2-zlMaZLzl.js"
	},
	"/assets/jsx-runtime-DTMSM_Xs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f53-6R8qbIIpe4h0Cs/oPVqqGE5JuqI\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 3923,
		"path": "../public/assets/jsx-runtime-DTMSM_Xs.js"
	},
	"/assets/link-Dk_PRq2c.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5c0f-pMjyoPxWwcYVGCsTSwkw9lbkMuE\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 23567,
		"path": "../public/assets/link-Dk_PRq2c.js"
	},
	"/assets/mock-BERU3geM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"97-vtsIN7bCXy3bfJGyJNBQMlzhwaM\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 151,
		"path": "../public/assets/mock-BERU3geM.js"
	},
	"/assets/message-square-npi41qXO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9-b1qg5PrXb5EN1bpedcdiQtIYURs\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 233,
		"path": "../public/assets/message-square-npi41qXO.js"
	},
	"/assets/pause-lJslDJ7O.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d3-TmrS0PXNzEkeZPk3RWK/Vhom9+s\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 211,
		"path": "../public/assets/pause-lJslDJ7O.js"
	},
	"/assets/pencil-BnkTgR0I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"114-Fn6Mb/6hzAAPkOt0kc39H3coyHw\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 276,
		"path": "../public/assets/pencil-BnkTgR0I.js"
	},
	"/assets/play-CRqnaONd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"be-zw28yuxf6Xv3U3iYpaJgK9RDokY\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 190,
		"path": "../public/assets/play-CRqnaONd.js"
	},
	"/assets/plus-C1C-jpSi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-MJRpHmjifGItzjxa79/f9DJUIKY\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 153,
		"path": "../public/assets/plus-C1C-jpSi.js"
	},
	"/assets/index-BTEK3thr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62852-noaom8PtQlvmP/ZHA+5esK0YAeY\"",
		"mtime": "2026-07-10T14:46:12.789Z",
		"size": 403538,
		"path": "../public/assets/index-BTEK3thr.js"
	},
	"/assets/power-CPIYhD9f.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ad-xTfCFLpYPF4/5Fyd2wZTZzqV/8Q\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 173,
		"path": "../public/assets/power-CPIYhD9f.js"
	},
	"/assets/radio-BTO-IUkd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"176-hAEBhy0nk2cCkZRRKP9QjeCE6jk\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 374,
		"path": "../public/assets/radio-BTO-IUkd.js"
	},
	"/assets/refresh-cw-CjdFUFqS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"141-l8uw11jI9VwP2GntaN7ZmmR0v28\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 321,
		"path": "../public/assets/refresh-cw-CjdFUFqS.js"
	},
	"/assets/save-C8GSNlDt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"147-SKGA8TAK3jV6l7vzZtzaserDHd0\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 327,
		"path": "../public/assets/save-C8GSNlDt.js"
	},
	"/assets/portal-CqYUx-gi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"bc57-AHLCC9MCMmY9h74kFm+cDXuBuyQ\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 48215,
		"path": "../public/assets/portal-CqYUx-gi.js"
	},
	"/assets/search-C6ahAHGB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ae-W5KnvcLZenNW47bUMwKU7eKaWpw\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 174,
		"path": "../public/assets/search-C6ahAHGB.js"
	},
	"/assets/routes-Bos5XuUD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"29c-Vvxf6E3c+P30XnaFw95aeUvuIKo\"",
		"mtime": "2026-07-10T14:46:12.796Z",
		"size": 668,
		"path": "../public/assets/routes-Bos5XuUD.js"
	},
	"/assets/send-ehGWcLoC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"122-zEMHUMJjcKEWCrViEsBKdthec/Y\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 290,
		"path": "../public/assets/send-ehGWcLoC.js"
	},
	"/assets/settings-NnctSg7K.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e7-woxV8BN34sdOeqQjbqzuYMORh9o\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 487,
		"path": "../public/assets/settings-NnctSg7K.js"
	},
	"/assets/shield-check-Dvtp2iIl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"140-qSVjmcLySG5DDQ1MnSVJIxX1c3g\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 320,
		"path": "../public/assets/shield-check-Dvtp2iIl.js"
	},
	"/assets/sparkles-BuDRn1EZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1ee-jhxuR+f6OjUztOIdB7tNCNZHUu4\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 494,
		"path": "../public/assets/sparkles-BuDRn1EZ.js"
	},
	"/assets/table-BukJ8Vg5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8ea-2eFSQ20/+hmT5gVBV4PubEH3pxY\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 2282,
		"path": "../public/assets/table-BukJ8Vg5.js"
	},
	"/assets/styles-29_PmpyN.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"1d931-m931XndGoS0jYJFWlaXSg+mCwzk\"",
		"mtime": "2026-07-10T14:46:12.799Z",
		"size": 121137,
		"path": "../public/assets/styles-29_PmpyN.css"
	},
	"/assets/toolsService-Fm2P_vqo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"160-czc327ESaUrZQloJkOpYbwTRlJk\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 352,
		"path": "../public/assets/toolsService-Fm2P_vqo.js"
	},
	"/assets/tabs-BxCTxrcX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e69-FGiSIOCSyNkqHhZ71vSfL38F2lk\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 3689,
		"path": "../public/assets/tabs-BxCTxrcX.js"
	},
	"/assets/trash-2-CTrqgv5V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"148-FLdYKLrKhzN1P7ZeVEkDusnZfgA\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 328,
		"path": "../public/assets/trash-2-CTrqgv5V.js"
	},
	"/assets/tooltip-CPpNjfaq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"213b-8xnWI24oB0ltmupWqygYKeoiGmE\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 8507,
		"path": "../public/assets/tooltip-CPpNjfaq.js"
	},
	"/assets/useMatch-C_F32MqB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"537-F2mUSE6LNUKbn2/w4sH4JbzlyCg\"",
		"mtime": "2026-07-10T14:46:12.797Z",
		"size": 1335,
		"path": "../public/assets/useMatch-C_F32MqB.js"
	},
	"/assets/useRouter-kdqYxofw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b7-Nhqp5EGrM10iflVAKWvaegwzltc\"",
		"mtime": "2026-07-10T14:46:12.798Z",
		"size": 695,
		"path": "../public/assets/useRouter-kdqYxofw.js"
	},
	"/assets/user-check-lMpyQNor.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f3-+4mFex88xxdgyg5AhK3OI3MMhr0\"",
		"mtime": "2026-07-10T14:46:12.798Z",
		"size": 243,
		"path": "../public/assets/user-check-lMpyQNor.js"
	},
	"/assets/utils-B6KiDbIe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a7d-iNkBSvaSyIjvZOzWoTvEa49qwcI\"",
		"mtime": "2026-07-10T14:46:12.799Z",
		"size": 27261,
		"path": "../public/assets/utils-B6KiDbIe.js"
	},
	"/assets/user-round-PDDe3kRx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b6-z+MIpUaYwYp/K/CGoRXDpz4ZMWk\"",
		"mtime": "2026-07-10T14:46:12.798Z",
		"size": 182,
		"path": "../public/assets/user-round-PDDe3kRx.js"
	},
	"/assets/webhook-CNjiNS0Z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"160-pJyAJnUxWeRerHedmqqImwNwX/Y\"",
		"mtime": "2026-07-10T14:46:12.799Z",
		"size": 352,
		"path": "../public/assets/webhook-CNjiNS0Z.js"
	},
	"/assets/with-selector-jqZcrNPz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"65f-Pt3TKfWI3PiTD5DpqBLFQpQu394\"",
		"mtime": "2026-07-10T14:46:12.799Z",
		"size": 1631,
		"path": "../public/assets/with-selector-jqZcrNPz.js"
	},
	"/assets/wrench-BSMwSG5Y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12f-DJnFv6A+MSdZbqhlHICRc6CEDOQ\"",
		"mtime": "2026-07-10T14:46:12.799Z",
		"size": 303,
		"path": "../public/assets/wrench-BSMwSG5Y.js"
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
