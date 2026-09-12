import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { emailsRouter } from "./routes/emails.js";

const app = express();

app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());

app.use("/auth", authRouter);
app.use("/api/emails", emailsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Erreur inconnue" });
});

app.listen(config.port, () => {
  console.log(`Backend prêt sur http://localhost:${config.port}`);
});
