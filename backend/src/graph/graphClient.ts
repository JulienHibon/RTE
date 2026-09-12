import { Client } from "@microsoft/microsoft-graph-client";
import { getAccessToken } from "../auth/msGraphAuth.js";

export interface GraphEmail {
  id: string;
  conversationId: string;
  subject: string;
  from: { name: string; address: string } | null;
  receivedDateTime: string;
  bodyPreview: string;
  bodyHtml: string;
  isRead: boolean;
}

function client(): Client {
  return Client.init({
    authProvider: async (done) => {
      try {
        const token = await getAccessToken();
        done(null, token);
      } catch (err) {
        done(err as Error, null);
      }
    },
  });
}

const MESSAGE_FIELDS =
  "id,conversationId,subject,from,receivedDateTime,bodyPreview,body,isRead";

function toGraphEmail(raw: any): GraphEmail {
  return {
    id: raw.id,
    conversationId: raw.conversationId,
    subject: raw.subject ?? "(sans objet)",
    from: raw.from?.emailAddress
      ? { name: raw.from.emailAddress.name, address: raw.from.emailAddress.address }
      : null,
    receivedDateTime: raw.receivedDateTime,
    bodyPreview: raw.bodyPreview ?? "",
    bodyHtml: raw.body?.content ?? "",
    isRead: Boolean(raw.isRead),
  };
}

/** Récupère les derniers mails de la boîte de réception (hors dossiers autres qu'Inbox). */
export async function fetchInboxMessages(limit = 30): Promise<GraphEmail[]> {
  const res = await client()
    .api("/me/mailFolders/inbox/messages")
    .select(MESSAGE_FIELDS)
    .top(limit)
    .orderby("receivedDateTime DESC")
    .get();
  return (res.value ?? []).map(toGraphEmail);
}

/**
 * Récupère des mails envoyés pertinents pour servir d'exemples de style (RAG) :
 * priorité aux réponses déjà données au même expéditeur / dans le même fil.
 */
export async function fetchSentMessagesFrom(
  senderAddress: string | null,
  limit = 5,
): Promise<GraphEmail[]> {
  const api = client().api("/me/mailFolders/sentitems/messages").select(MESSAGE_FIELDS).top(limit);
  if (senderAddress) {
    // $search porte sur le contenu; on cherche l'adresse du destinataire dans les mails envoyés
    api.search(`"to:${senderAddress}"`);
  } else {
    api.orderby("sentDateTime DESC");
  }
  const res = await api.get();
  return (res.value ?? []).map(toGraphEmail);
}

export async function fetchMessageById(messageId: string): Promise<GraphEmail> {
  const res = await client().api(`/me/messages/${messageId}`).select(MESSAGE_FIELDS).get();
  return toGraphEmail(res);
}

/** Crée un brouillon de réponse, y insère le texte fourni, puis l'envoie. */
export async function sendReply(messageId: string, replyHtml: string): Promise<void> {
  const c = client();
  const draft = await c.api(`/me/messages/${messageId}/createReply`).post({});
  await c.api(`/me/messages/${draft.id}`).patch({
    body: { contentType: "HTML", content: replyHtml },
  });
  await c.api(`/me/messages/${draft.id}/send`).post({});
}
