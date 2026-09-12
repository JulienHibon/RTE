import { Router } from "express";
import { z } from "zod";
import { fetchInboxMessages, fetchMessageById, sendReply } from "../graph/graphClient.js";
import { classifyEmail } from "../classify/classifier.js";
import { generateDraftReply } from "../reply/replyGenerator.js";
import {
  getEmailState,
  setClassification,
  overrideCategory,
  setDraft,
  markSent,
} from "../store/db.js";

export const emailsRouter = Router();

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textToHtml(text: string): string {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Liste les mails de la boîte de réception avec leur catégorie (classification à la demande). */
emailsRouter.get("/", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 30);
    const messages = await fetchInboxMessages(limit);

    const enriched = await Promise.all(
      messages.map(async (email) => {
        let state = await getEmailState(email.id);
        if (!state) {
          const { category, reason } = await classifyEmail(email);
          await setClassification(email.id, category, reason);
          state = await getEmailState(email.id);
        }
        return {
          id: email.id,
          subject: email.subject,
          from: email.from,
          receivedDateTime: email.receivedDateTime,
          bodyPreview: email.bodyPreview,
          isRead: email.isRead,
          category: state!.category,
          categoryReason: state!.categoryReason,
          overridden: state!.overridden,
          draft: state!.draft,
          sent: state!.sent,
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

const CategorySchema = z.object({
  category: z.enum(["a_repondre", "a_lire", "sans_interet"]),
});

/** Déplace manuellement un mail dans une autre colonne (correction utilisateur). */
emailsRouter.post("/:id/category", async (req, res, next) => {
  try {
    const { category } = CategorySchema.parse(req.body);
    await overrideCategory(req.params.id, category);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Génère (ou régénère) un brouillon de réponse basé sur le style de l'utilisateur. */
emailsRouter.post("/:id/draft/generate", async (req, res, next) => {
  try {
    const email = await fetchMessageById(req.params.id);
    const draft = await generateDraftReply(email);
    await setDraft(email.id, draft);
    res.json({ draft });
  } catch (err) {
    next(err);
  }
});

const DraftSchema = z.object({ draft: z.string() });

/** Enregistre les corrections manuelles de l'utilisateur sur le brouillon. */
emailsRouter.put("/:id/draft", async (req, res, next) => {
  try {
    const { draft } = DraftSchema.parse(req.body);
    await setDraft(req.params.id, draft);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** Envoie la réponse validée par l'utilisateur (texte final fourni dans le body). */
emailsRouter.post("/:id/send", async (req, res, next) => {
  try {
    const { draft } = DraftSchema.parse(req.body);
    await sendReply(req.params.id, textToHtml(draft));
    await setDraft(req.params.id, draft);
    await markSent(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
