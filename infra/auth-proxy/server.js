const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const http = require("http");
const httpProxy = require("http-proxy");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 8080;
const AUTH_PROXY_SHARED_SECRET = process.env.AUTH_PROXY_SHARED_SECRET;
const API_TARGET = process.env.API_TARGET || "http://api:3001";
const FRONTEND_TARGET = process.env.FRONTEND_TARGET || "http://frontend:4173";

// HTML for login page with high-end premium developer look
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const loginPageHtml = (error = "") => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cubo AI Studio — Homologação</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-gradient: radial-gradient(circle at 16% 0%, rgba(37, 99, 235, 0.10), transparent 34%),
                           radial-gradient(circle at 84% 12%, rgba(14, 165, 233, 0.07), transparent 28%),
                           #f7f9fc;
            --card-bg: rgba(255, 255, 255, 0.94);
            --card-border: #e2e8f0;
            --primary: #2563eb;
            --primary-hover: #1d4ed8;
            --primary-glow: rgba(37, 99, 235, 0.18);
            --text-main: #0f172a;
            --text-muted: #64748b;
            --error-bg: #fef2f2;
            --error-border: #fecaca;
            --error-text: #b91c1c;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: var(--bg-gradient);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            overflow-x: hidden;
        }

        .login-card {
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            width: 100%;
            max-width: 420px;
            padding: 36px;
            box-shadow: 0 24px 60px -24px rgba(15, 23, 42, 0.22);
            position: relative;
            animation: fadeIn 0.6s ease-out;
        }

        .login-card::before {
            content: "CUBO AI STUDIO";
            position: absolute;
            top: 18px;
            left: 20px;
            color: #94a3b8;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 1.6px;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .header-logo {
            text-align: center;
            margin-bottom: 28px;
            margin-top: 12px;
        }

        .logo-symbol {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            background: linear-gradient(145deg, #2563eb, #1d4ed8);
            border: 1px solid rgba(255, 255, 255, 0.35);
            border-radius: 14px;
            font-size: 0;
            margin-bottom: 14px;
            box-shadow: 0 8px 24px var(--primary-glow);
            transition: transform 0.3s ease;
        }

        .logo-symbol::after {
            content: "C";
            color: white;
            font-family: 'Outfit', sans-serif;
            font-size: 22px;
            font-weight: 700;
        }

        .login-card:hover .logo-symbol {
            transform: scale(1.05) rotate(3deg);
        }

        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 25px;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: #0f172a;
        }

        .subtitle {
            font-size: 14px;
            color: var(--text-muted);
            margin-top: 6px;
        }

        .form-group {
            margin-bottom: 18px;
        }

        label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.75px;
        }

        input {
            width: 100%;
            padding: 12px 14px;
            background: #ffffff;
            border: 1px solid #dbe3ee;
            border-radius: 10px;
            color: #0f172a;
            font-family: inherit;
            font-size: 15px;
            transition: all 0.25s ease;
            outline: none;
        }

        input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
            background: #ffffff;
        }

        input::placeholder {
            color: #94a3b8;
        }

        .btn-submit {
            width: 100%;
            padding: 13px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            border: none;
            border-radius: 10px;
            color: white;
            font-family: inherit;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s ease;
            margin-top: 8px;
            box-shadow: 0 8px 20px rgba(37, 99, 235, 0.22);
        }

        .btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 24px rgba(37, 99, 235, 0.28);
            background: linear-gradient(135deg, #1d4ed8, #1e40af);
        }

        .btn-submit:active {
            transform: translateY(0);
        }

        .error-message {
            background: var(--error-bg);
            border: 1px solid var(--error-border);
            color: var(--error-text);
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            margin-bottom: 24px;
            text-align: center;
            animation: shake 0.4s ease-in-out;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }

        footer {
            margin-top: 32px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="header-logo">
            <div class="logo-symbol" aria-hidden="true"></div>
            <h1>Cubo AI Studio</h1>
            <p class="subtitle">Acesse o portal global da sua operação.</p>
        </div>
        
        ${error ? `<div class="error-message">${escapeHtml(error)}</div>` : ""}
        
        <form method="POST" action="/staging/login">
            <div class="form-group">
                <label for="email">E-mail Corporativo</label>
                <input type="email" id="email" name="email" required placeholder="seu.nome@cubo.chat" autocomplete="email">
            </div>
            <div class="form-group">
                <label for="password">Senha</label>
                <input type="password" id="password" name="password" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn-submit">Acessar Plataforma</button>
        </form>
        
        <footer>
            Ambiente de homologação · Uso interno
        </footer>
    </div>
</body>
</html>
`;

// Helper to build HMAC signature
function buildSignature({ userId, email, name, timestamp, secret }) {
  return crypto
    .createHmac("sha256", secret)
    .update([userId.trim(), email.trim().toLowerCase(), name.trim(), timestamp.trim()].join("\n"))
    .digest("hex");
}

// Retrieve staging session
function getSession(req) {
  const sessionCookie = req.cookies.staging_session;
  if (!sessionCookie) return null;
  try {
    const [payload, signature] = sessionCookie.split(".");
    if (!payload || !signature || !AUTH_PROXY_SHARED_SECRET) return null;
    const expected = crypto
      .createHmac("sha256", AUTH_PROXY_SHARED_SECRET)
      .update(payload)
      .digest("base64url");
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      return null;
    }
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch (e) {
    return null;
  }
}

function createSessionCookie(session) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_PROXY_SHARED_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

// Login endpoints
app.get("/staging/login", (req, res) => {
  res.send(loginPageHtml());
});

app.post("/staging/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send(loginPageHtml("Informe e-mail e senha."));
  }

  try {
    const response = await fetch(`${API_TARGET}/auth/studio-login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-auth-proxy-secret": AUTH_PROXY_SHARED_SECRET,
      },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return res.status(401).send(loginPageHtml("E-mail ou senha inválidos, ou usuário inativo."));
    }

    const authenticatedUser = await response.json();
    const encoded = createSessionCookie({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
    });
    res.cookie("staging_session", encoded, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000,
    });

    return res.redirect("/portal");
  } catch (error) {
    console.error("Studio login failed:", error instanceof Error ? error.message : error);
    return res.status(502).send(loginPageHtml("Não foi possível validar o acesso agora."));
  }
});

app.get("/staging/logout", (req, res) => {
  res.clearCookie("staging_session");
  res.redirect("/staging/login");
});

// Configure http-proxy
const proxy = httpProxy.createProxyServer({});

proxy.on("error", (err, req, res) => {
  console.error("Proxy forwarding error:", err);
  if (!res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad Gateway - Staging Proxy Error");
  }
});

// Main router & proxy handler
app.use((req, res) => {
  const path = req.path;

  // 1. Identify public paths to bypass proxy auth verification
  const isPublicPath =
    path === "/health" ||
    path === "/api/health" ||
    path.startsWith("/webhooks/") ||
    path.startsWith("/api/webhooks/") ||
    path === "/apps/google-calendar/oauth/callback" ||
    path === "/api/apps/google-calendar/oauth/callback";

  if (isPublicPath) {
    // If request contains /api/ prefix, rewrite URL for API target
    if (path.startsWith("/api/")) {
      req.url = req.url.replace(/^\/api/, "") || "/";
    }
    return proxy.web(req, res, { target: API_TARGET });
  }

  // 2. Validate session
  const session = getSession(req);
  if (!session) {
    if (path.startsWith("/api/")) {
      return res.status(401).json({ error: "Sua sessão de staging expirou ou é inválida." });
    }
    return res.redirect("/staging/login");
  }

  // 3. Forward authenticated requests
  if (path.startsWith("/api/")) {
    // Rewrite path to remove /api (NestJS API is at root /)
    req.url = req.url.replace(/^\/api/, "") || "/";

    delete req.headers["x-auth-user-id"];
    delete req.headers["x-auth-user-email"];
    delete req.headers["x-auth-user-name"];
    delete req.headers["x-auth-timestamp"];
    delete req.headers["x-auth-signature"];
    delete req.headers["x-auth-proxy-secret"];

    // Inject and sign headers
    const timestamp = new Date().toISOString();
    const signature = buildSignature({
      userId: session.userId,
      email: session.email,
      name: session.name,
      timestamp,
      secret: AUTH_PROXY_SHARED_SECRET,
    });

    req.headers["x-auth-user-id"] = session.userId;
    req.headers["x-auth-user-email"] = session.email;
    req.headers["x-auth-user-name"] = session.name;
    req.headers["x-auth-timestamp"] = timestamp;
    req.headers["x-auth-signature"] = signature;

    // Remove user cookie to avoid passing cookies downstream to NestJS API
    delete req.headers["cookie"];

    return proxy.web(req, res, { target: API_TARGET });
  } else {
    // Frontend static resources
    return proxy.web(req, res, { target: FRONTEND_TARGET });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  if (!AUTH_PROXY_SHARED_SECRET) {
    throw new Error("AUTH_PROXY_SHARED_SECRET is required.");
  }
  console.log(`[auth-proxy] Listening on port ${PORT}`);
  console.log(`[auth-proxy] Forwarding API to ${API_TARGET}`);
  console.log(`[auth-proxy] Forwarding Frontend to ${FRONTEND_TARGET}`);
});
