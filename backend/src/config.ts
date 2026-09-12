import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name} (voir .env.example)`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  ms: {
    clientId: required("MS_CLIENT_ID"),
    clientSecret: required("MS_CLIENT_SECRET"),
    tenantId: process.env.MS_TENANT_ID ?? "common",
    redirectUri: process.env.MS_REDIRECT_URI ?? "http://localhost:3001/auth/callback",
  },
  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY"),
    classifyModel: process.env.CLASSIFY_MODEL ?? "claude-opus-5",
    draftModel: process.env.DRAFT_MODEL ?? "claude-opus-5",
  },
};
