//#region node_modules/.nitro/vite/services/ssr/assets/apiClient-Bei-u2-_.js
var API_BASE = "http://localhost:3001";
var DEV_AUTH_HEADERS = {
	"x-dev-user-id": "user_demo_cubo_ai_studio",
	"x-dev-company-id": "company_demo_cubo_ai_studio",
	"x-dev-user-email": "demo@cubo.chat"
};
var ApiError = class extends Error {
	status;
	details;
	constructor(status, message, details = {}) {
		super(message);
		this.status = status;
		this.details = details;
	}
};
function buildNetworkErrorMessage(requestUrl) {
	return `Não foi possível conectar ao backend em ${requestUrl}. Verifique se você rodou: npm run api:start`;
}
function extractErrorResponse(body, fallback) {
	if (!body.trim()) return { message: fallback };
	try {
		const parsed = JSON.parse(body);
		const providerError = isProviderError(parsed.providerError) ? parsed.providerError : void 0;
		const providerStatus = typeof parsed.providerStatus === "number" ? parsed.providerStatus : void 0;
		if (Array.isArray(parsed.message)) return {
			message: parsed.message.join(" "),
			providerStatus,
			providerError
		};
		if (typeof parsed.message === "string" && parsed.message.trim().length > 0) return {
			message: parsed.message,
			providerStatus,
			providerError
		};
		if (typeof parsed.error === "string" && parsed.error.trim().length > 0) return {
			message: parsed.error,
			providerStatus,
			providerError
		};
	} catch {
		return { message: body };
	}
	return { message: fallback };
}
function isProviderError(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const candidate = value;
	return [
		"message",
		"type",
		"code",
		"param"
	].every((key) => candidate[key] === void 0 || typeof candidate[key] === "string");
}
async function apiFetch(path, init = {}) {
	const headers = new Headers(init.headers ?? {});
	for (const [key, value] of Object.entries(DEV_AUTH_HEADERS)) if (!headers.has(key)) headers.set(key, value);
	if (init.body != null && init.body !== void 0 && !headers.has("Content-Type") && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
	const requestUrl = path.startsWith("http://") || path.startsWith("https://") ? path : `${API_BASE}${path}`;
	let res;
	try {
		res = await fetch(requestUrl, {
			credentials: "include",
			headers,
			...init
		});
	} catch (err) {
		if (err instanceof DOMException && err.name === "AbortError") throw err;
		throw new ApiError(0, buildNetworkErrorMessage(requestUrl));
	}
	if (!res.ok) {
		let body = "";
		try {
			body = await res.text();
		} catch {
			body = "";
		}
		const errorResponse = extractErrorResponse(body, res.statusText);
		throw new ApiError(res.status, errorResponse.message, {
			providerStatus: errorResponse.providerStatus,
			providerError: errorResponse.providerError
		});
	}
	if (res.status === 204) return;
	if ((res.headers.get("content-type") ?? "").includes("application/json")) return await res.json();
	return await res.text();
}
//#endregion
export { apiFetch as n, ApiError as t };
