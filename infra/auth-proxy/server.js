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
const STAGING_PASSWORD = process.env.STAGING_PASSWORD || "cubo-staging-2026";
const AUTH_PROXY_SHARED_SECRET = process.env.AUTH_PROXY_SHARED_SECRET;
const API_TARGET = process.env.API_TARGET || "http://api:3001";
const FRONTEND_TARGET = process.env.FRONTEND_TARGET || "http://frontend:4173";

// HTML for login page with high-end premium developer look
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
            --bg-gradient: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0f172a 50%, #020617 100%);
            --card-bg: rgba(15, 23, 42, 0.45);
            --card-border: rgba(255, 255, 255, 0.08);
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --primary-glow: rgba(99, 102, 241, 0.15);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --error-bg: rgba(239, 68, 68, 0.1);
            --error-border: rgba(239, 68, 68, 0.2);
            --error-text: #f87171;
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
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--card-border);
            border-radius: 24px;
            width: 100%;
            max-width: 460px;
            padding: 48px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 
                        inset 0 1px 1px rgba(255, 255, 255, 0.1);
            position: relative;
            animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .header-logo {
            text-align: center;
            margin-bottom: 36px;
        }

        .logo-symbol {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 18px;
            font-size: 32px;
            margin-bottom: 16px;
            box-shadow: 0 8px 24px var(--primary-glow);
            transition: transform 0.3s ease;
        }

        .login-card:hover .logo-symbol {
            transform: scale(1.05) rotate(3deg);
        }

        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, #ffffff 30%, #c7d2fe 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            font-size: 14px;
            color: var(--text-muted);
            margin-top: 6px;
        }

        .form-group {
            margin-bottom: 22px;
        }

        label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #cbd5e1;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.75px;
        }

        input {
            width: 100%;
            padding: 14px 18px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            color: white;
            font-family: inherit;
            font-size: 15px;
            transition: all 0.25s ease;
            outline: none;
        }

        input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
            background: rgba(15, 23, 42, 0.8);
        }

        input::placeholder {
            color: #475569;
        }

        .btn-submit {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            border: none;
            border-radius: 12px;
            color: white;
            font-family: inherit;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s ease;
            margin-top: 8px;
            box-shadow: 0 4px 20px rgba(79, 70, 229, 0.35);
        }

        .btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 24px rgba(79, 70, 229, 0.5);
            background: linear-gradient(135deg, #4f46e5, #4338ca);
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
            color: #475569;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="header-logo">
            <div class="logo-symbol">🤖</div>
            <h1>Cubo AI Studio</h1>
            <p class="subtitle">Ambiente de Homologação (Staging)</p>
        </div>
        
        ${error ? `<div class="error-message">${error}</div>` : ""}
        
        <form method="POST" action="/staging/login">
            <div class="form-group">
                <label for="email">E-mail Corporativo</label>
                <input type="email" id="email" name="email" required placeholder="seu.nome@cubo.chat" autocomplete="email">
            </div>
            <div class="form-group">
                <label for="name">Nome Completo</label>
                <input type="text" id="name" name="name" required placeholder="Seu Nome" autocomplete="name">
            </div>
            <div class="form-group">
                <label for="password">Senha de Staging</label>
                <input type="password" id="password" name="password" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn-submit">Acessar Plataforma</button>
        </form>
        
        <footer>
            Uso Interno Autorizado Apenas
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
    const decoded = Buffer.from(sessionCookie, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

// Login endpoints
app.get("/staging/login", (req, res) => {
  res.send(loginPageHtml());
});

app.post("/staging/login", (req, res) => {
  const { email, name, password } = req.body;
  if (password !== STAGING_PASSWORD) {
    return res.send(loginPageHtml("Senha de acesso staging inválida."));
  }
  if (!email || !name) {
    return res.send(loginPageHtml("Por favor, preencha todos os campos."));
  }

  // Generate a deterministic but unique id for the user
  const emailHash = crypto.createHash("md5").update(email.toLowerCase().trim()).digest("hex");
  const userId = `stg-usr-${emailHash.slice(0, 12)}`;

  const session = {
    userId,
    email: email.toLowerCase().trim(),
    name: name.trim(),
  };

  const encoded = Buffer.from(JSON.stringify(session)).toString("base64");
  res.cookie("staging_session", encoded, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.redirect("/");
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
  console.log(`[auth-proxy] Listening on port ${PORT}`);
  console.log(`[auth-proxy] Forwarding API to ${API_TARGET}`);
  console.log(`[auth-proxy] Forwarding Frontend to ${FRONTEND_TARGET}`);
});
