import fs from "node:fs";
import path from "node:path";
import { ConfidentialClientApplication, type AccountInfo } from "@azure/msal-node";
import { config } from "../config.js";

const SCOPES = ["User.Read", "Mail.Read", "Mail.ReadWrite", "Mail.Send"];

const DATA_DIR = path.resolve(process.cwd(), "data");
const CACHE_FILE = path.join(DATA_DIR, "msal-cache.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

const msalApp = new ConfidentialClientApplication({
  auth: {
    clientId: config.ms.clientId,
    clientSecret: config.ms.clientSecret,
    authority: `https://login.microsoftonline.com/${config.ms.tenantId}`,
  },
  cache: {
    cachePlugin: {
      beforeCacheAccess: async (ctx) => {
        if (fs.existsSync(CACHE_FILE)) {
          ctx.tokenCache.deserialize(fs.readFileSync(CACHE_FILE, "utf-8"));
        }
      },
      afterCacheAccess: async (ctx) => {
        if (ctx.cacheHasChanged) {
          fs.writeFileSync(CACHE_FILE, ctx.tokenCache.serialize());
        }
      },
    },
  },
});

let activeAccount: AccountInfo | null = null;

export function getAuthCodeUrl(): Promise<string> {
  return msalApp.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: config.ms.redirectUri,
  });
}

export async function handleAuthCallback(code: string): Promise<AccountInfo> {
  const result = await msalApp.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: config.ms.redirectUri,
  });
  if (!result?.account) {
    throw new Error("Authentification Microsoft échouée: aucun compte retourné");
  }
  activeAccount = result.account;
  return result.account;
}

/** Récupère un token d'accès valide, en le rafraîchissant silencieusement si besoin. */
export async function getAccessToken(): Promise<string> {
  const cache = msalApp.getTokenCache();

  let account = activeAccount;
  if (!account) {
    const accounts = await cache.getAllAccounts();
    account = accounts[0] ?? null;
  }
  if (!account) {
    throw new Error("Non authentifié: connectez-vous via /auth/login");
  }

  const result = await msalApp.acquireTokenSilent({ account, scopes: SCOPES });
  if (!result?.accessToken) {
    throw new Error("Impossible de rafraîchir le token: reconnectez-vous via /auth/login");
  }
  activeAccount = account;
  return result.accessToken;
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
