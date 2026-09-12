import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { fetchSentMessagesFrom, type GraphEmail } from "../graph/graphClient.js";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

function truncate(text: string, max = 1200): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

/** Construit des exemples de style à partir des réponses déjà envoyées par l'utilisateur (RAG léger). */
async function buildStyleExamples(email: GraphEmail): Promise<string> {
  const sent = await fetchSentMessagesFrom(email.from?.address ?? null, 3);
  if (sent.length === 0) return "(Aucun historique de réponse disponible pour cet expéditeur.)";

  return sent
    .map(
      (m, i) =>
        `Exemple ${i + 1} — Objet: ${m.subject}\n${truncate(m.bodyPreview)}`,
    )
    .join("\n\n---\n\n");
}

const SYSTEM_PROMPT = `Tu rédiges des brouillons de réponse email au nom de l'utilisateur, en français, en imitant fidèlement son style habituel (longueur, ton, formules de politesse) déduit des exemples fournis.

Règles :
- Réponds uniquement avec le corps du message (pas d'objet, pas de "De/À").
- Reste concis et adapté au registre professionnel observé dans les exemples.
- Ne signe pas avec un nom si les exemples ne le font pas systématiquement.
- Si l'email nécessite une information que tu n'as pas, rédige une réponse générique demandant une précision plutôt que d'inventer des faits.`;

export async function generateDraftReply(email: GraphEmail): Promise<string> {
  const styleExamples = await buildStyleExamples(email);

  const response = await client.messages.create({
    model: config.anthropic.draftModel,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `## Exemples de réponses passées de l'utilisateur (pour le style)`,
          styleExamples,
          ``,
          `## Email auquel répondre`,
          `De: ${email.from?.name ?? "?"} <${email.from?.address ?? "?"}>`,
          `Objet: ${email.subject}`,
          truncate(email.bodyPreview || email.bodyHtml, 3000),
          ``,
          `Rédige le brouillon de réponse.`,
        ].join("\n"),
      },
    ],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  return textBlock?.text ?? "";
}
