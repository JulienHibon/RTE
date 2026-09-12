import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { config } from "../config.js";
import type { GraphEmail } from "../graph/graphClient.js";
import type { Category } from "../store/db.js";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

const ClassificationSchema = z.object({
  category: z.enum(["a_repondre", "a_lire", "sans_interet"]),
  reason: z.string().describe("Justification courte (une phrase) en français"),
});

const SYSTEM_PROMPT = `Tu triages la boîte mail professionnelle d'un utilisateur. Pour chaque email, choisis exactement une catégorie :

- "a_repondre" : l'email attend explicitement ou implicitement une réponse de l'utilisateur (question, demande d'action, invitation à confirmer, sollicitation directe d'une personne).
- "a_lire" : information utile mais qui n'appelle aucune réponse (compte-rendu, notification pertinente, newsletter métier, mise à jour de projet en copie).
- "sans_interet" : spam, publicité, notification automatique sans valeur, newsletter générique non pertinente.

Base ta décision sur l'objet et le corps du mail. Sois strict : seuls les mails qui exigent vraiment une action de réponse vont dans "a_repondre".`;

function truncate(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export async function classifyEmail(
  email: GraphEmail,
): Promise<{ category: Category; reason: string }> {
  const response = await client.messages.parse({
    model: config.anthropic.classifyModel,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          `De: ${email.from?.name ?? "?"} <${email.from?.address ?? "?"}>`,
          `Objet: ${email.subject}`,
          `Corps:`,
          truncate(email.bodyPreview || email.bodyHtml),
        ].join("\n"),
      },
    ],
    output_config: { format: zodOutputFormat(ClassificationSchema) },
  });

  if (!response.parsed_output) {
    return { category: "a_lire", reason: "Classification indisponible (réponse non parsée)" };
  }
  return response.parsed_output;
}
