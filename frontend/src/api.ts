export type Category = "a_repondre" | "a_lire" | "sans_interet";

export interface EmailItem {
  id: string;
  subject: string;
  from: { name: string; address: string } | null;
  receivedDateTime: string;
  bodyPreview: string;
  isRead: boolean;
  category: Category;
  categoryReason: string;
  overridden: boolean;
  draft: string | null;
  sent: boolean;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erreur ${res.status}`);
  }
  return res.json();
}

export const api = {
  authStatus: () => request<{ authenticated: boolean }>("/auth/status"),
  loginUrl: () => `${API_URL}/auth/login`,
  listEmails: () => request<EmailItem[]>("/api/emails"),
  setCategory: (id: string, category: Category) =>
    request<{ ok: true }>(`/api/emails/${id}/category`, {
      method: "POST",
      body: JSON.stringify({ category }),
    }),
  generateDraft: (id: string) =>
    request<{ draft: string }>(`/api/emails/${id}/draft/generate`, { method: "POST" }),
  saveDraft: (id: string, draft: string) =>
    request<{ ok: true }>(`/api/emails/${id}/draft`, {
      method: "PUT",
      body: JSON.stringify({ draft }),
    }),
  sendDraft: (id: string, draft: string) =>
    request<{ ok: true }>(`/api/emails/${id}/send`, {
      method: "POST",
      body: JSON.stringify({ draft }),
    }),
};
