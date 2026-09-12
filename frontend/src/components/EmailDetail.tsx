import { useEffect, useState } from "react";
import type { Category, EmailItem } from "../api";

interface Props {
  email: EmailItem;
  onClose: () => void;
  onMoveCategory: (category: Category) => void;
  onGenerateDraft: () => Promise<string>;
  onSaveDraft: (draft: string) => Promise<void>;
  onSend: (draft: string) => Promise<void>;
}

const CATEGORY_LABELS: Record<Category, string> = {
  a_repondre: "À répondre",
  a_lire: "À lire",
  sans_interet: "Sans intérêt",
};

export function EmailDetail({
  email,
  onClose,
  onMoveCategory,
  onGenerateDraft,
  onSaveDraft,
  onSend,
}: Props) {
  const [draft, setDraft] = useState(email.draft ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(email.draft ?? "");
    setError(null);
  }, [email.id]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const generated = await onGenerateDraft();
      setDraft(generated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSaveDraft(draft);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!draft.trim()) {
      setError("Le brouillon est vide.");
      return;
    }
    if (!confirm("Envoyer cette réponse maintenant ?")) return;
    setSending(true);
    setError(null);
    try {
      await onSend(draft);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div>
            <div className="detail-subject">{email.subject}</div>
            <div className="detail-from">
              {email.from?.name} &lt;{email.from?.address}&gt;
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail-category">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              className={`category-pill ${email.category === cat ? "active" : ""}`}
              onClick={() => onMoveCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <div className="detail-reason">Raison du tri : {email.categoryReason}</div>

        <div className="detail-body">{email.bodyPreview}</div>

        <div className="draft-section">
          <div className="draft-header">
            <h3>Brouillon de réponse</h3>
            <button onClick={handleGenerate} disabled={generating}>
              {generating ? "Génération…" : email.draft ? "Régénérer" : "Générer un brouillon"}
            </button>
          </div>
          <textarea
            className="draft-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Cliquez sur « Générer un brouillon » ou rédigez votre réponse ici…"
            rows={10}
          />
          {error && <div className="error-text">{error}</div>}
          <div className="draft-actions">
            <button onClick={handleSave} disabled={saving || sending}>
              {saving ? "Enregistrement…" : "Enregistrer le brouillon"}
            </button>
            <button className="send-btn" onClick={handleSend} disabled={sending || email.sent}>
              {email.sent ? "Déjà envoyé" : sending ? "Envoi…" : "Valider et envoyer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
