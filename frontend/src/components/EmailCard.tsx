import type { EmailItem } from "../api";

interface Props {
  email: EmailItem;
  onOpen: () => void;
}

export function EmailCard({ email, onOpen }: Props) {
  const date = new Date(email.receivedDateTime).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button className="email-card" onClick={onOpen}>
      <div className="email-card-top">
        <span className="email-card-from">{email.from?.name ?? email.from?.address ?? "?"}</span>
        <span className="email-card-date">{date}</span>
      </div>
      <div className="email-card-subject">{email.subject}</div>
      <div className="email-card-preview">{email.bodyPreview}</div>
      {email.sent && <span className="badge badge-sent">Envoyé</span>}
      {email.draft && !email.sent && <span className="badge badge-draft">Brouillon prêt</span>}
    </button>
  );
}
