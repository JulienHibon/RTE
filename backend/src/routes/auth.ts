import { Router } from "express";
import { getAuthCodeUrl, handleAuthCallback, isAuthenticated } from "../auth/msGraphAuth.js";
import { config } from "../config.js";

export const authRouter = Router();

authRouter.get("/login", async (_req, res) => {
  const url = await getAuthCodeUrl();
  res.redirect(url);
});

authRouter.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (typeof code !== "string") {
    res.status(400).send("Code d'autorisation manquant");
    return;
  }
  try {
    await handleAuthCallback(code);
    res.redirect(config.frontendUrl);
  } catch (err) {
    res.status(500).send(`Échec de l'authentification: ${(err as Error).message}`);
  }
});

authRouter.get("/status", async (_req, res) => {
  res.json({ authenticated: await isAuthenticated() });
});
