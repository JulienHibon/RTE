import type { Category, EmailItem } from "../api";
import { EmailCard } from "./EmailCard";

const COLUMNS: { category: Category; label: string }[] = [
  { category: "a_repondre", label: "À répondre" },
  { category: "a_lire", label: "À lire" },
  { category: "sans_interet", label: "Sans intérêt" },
];

interface Props {
  emails: EmailItem[];
  onOpen: (email: EmailItem) => void;
  onMove: (id: string, category: Category) => void;
}

export function KanbanBoard({ emails, onOpen, onMove }: Props) {
  return (
    <div className="board">
      {COLUMNS.map((col) => {
        const items = emails.filter((e) => e.category === col.category);
        return (
          <div
            key={col.category}
            className="column"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/email-id");
              if (id) onMove(id, col.category);
            }}
          >
            <div className="column-header">
              {col.label} <span className="column-count">{items.length}</span>
            </div>
            <div className="column-body">
              {items.map((email) => (
                <div
                  key={email.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/email-id", email.id)}
                >
                  <EmailCard email={email} onOpen={() => onOpen(email)} />
                </div>
              ))}
              {items.length === 0 && <div className="column-empty">Aucun mail</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
