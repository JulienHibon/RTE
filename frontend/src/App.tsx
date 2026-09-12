import { useEffect, useState } from "react";
import { api, type Category, type EmailItem } from "./api";
import { KanbanBoard } from "./components/KanbanBoard";
import { EmailDetail } from "./components/EmailDetail";

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    api
      .authStatus()
      .then((r) => setAuthenticated(r.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    if (authenticated) void loadEmails();
  }, [authenticated]);

  async function loadEmails() {
    setLoading(true);
    setError(null);
    try {
      setEmails(await api.listEmails());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMove(id: string, category: Category) {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, category, overridden: true } : e)));
    await api.setCategory(id, category);
  }

  function updateEmail(id: string, patch: Partial<EmailItem>) {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  const selected = emails.find((e) => e.id === selectedId) ?? null;

  if (authenticated === null) {
    return <div className="center-screen">Chargement…</div>;
  }

  if (!authenticated) {
    return (
      <div className="center-screen">
        <h1>Tri de mails Outlook</h1>
        <p>Connectez-vous à votre compte Outlook pour commencer.</p>
        <a className="login-btn" href={api.loginUrl()}>
          Se connecter à Outlook
        </a>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tri de mails Outlook</h1>
        <button onClick={loadEmails} disabled={loading}>
          {loading ? "Chargement…" : "Actualiser"}
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <KanbanBoard emails={emails} onOpen={(e) => setSelectedId(e.id)} onMove={handleMove} />

      {selected && (
        <EmailDetail
          email={selected}
          onClose={() => setSelectedId(null)}
          onMoveCategory={(category) => handleMove(selected.id, category)}
          onGenerateDraft={async () => {
            const { draft } = await api.generateDraft(selected.id);
            updateEmail(selected.id, { draft });
            return draft;
          }}
          onSaveDraft={async (draft) => {
            await api.saveDraft(selected.id, draft);
            updateEmail(selected.id, { draft });
          }}
          onSend={async (draft) => {
            await api.sendDraft(selected.id, draft);
            updateEmail(selected.id, { draft, sent: true });
          }}
        />
      )}
    </div>
  );
}
