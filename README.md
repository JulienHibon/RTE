# Tri de mails Outlook + réponses assistées

Prototype local : lit votre boîte Outlook, classe chaque mail dans une colonne
(**À répondre**, **À lire**, **Sans intérêt**), et propose un brouillon de
réponse imitant votre style à partir de vos mails envoyés. Vous corrigez le
classement si besoin, éditez le brouillon, puis validez l'envoi.

Composé de deux applications que vous lancez vous-même sur votre machine :

- `backend/` — API Node/Express/TypeScript qui parle à Microsoft Graph
  (Outlook) et à l'API Claude (Anthropic).
- `frontend/` — interface React (tableau Kanban + panneau de réponse).

Rien n'est hébergé pour vous : vos mails ne transitent que par votre machine,
Microsoft Graph et Anthropic.

## Architecture

```
Outlook (Microsoft Graph API)
        │  OAuth2 (MSAL)
        ▼
   backend (Express)
   ├── classification des mails  → Claude (sortie structurée)
   ├── génération de brouillon   → Claude (style basé sur vos mails envoyés)
   └── stockage local (data/db.json — classement + brouillons)
        │  REST (JSON)
        ▼
   frontend (React) — Kanban + édition/validation avant envoi
```

Aucun envoi n'a lieu sans validation explicite dans l'interface.

## Prérequis

- Node.js ≥ 18
- Un compte Microsoft 365 / Outlook
- Une clé API Anthropic (https://console.anthropic.com/)

## 1. Créer une application Azure AD (Microsoft Entra ID)

Il faut enregistrer une application pour autoriser l'accès à votre boîte
Outlook via Microsoft Graph :

1. Allez sur https://entra.microsoft.com/ (ou le portail Azure) →
   **Identité** → **Inscriptions d'applications** → **Nouvelle inscription**.
2. Nom : ce que vous voulez (ex. "Tri mails perso").
3. Type de compte : *"Comptes dans n'importe quel annuaire organisationnel et
   comptes Microsoft personnels"* si vous utilisez un compte
   @outlook.com/@hotmail.com, sinon *"Comptes de cet annuaire uniquement"*.
4. URI de redirection : type **Web**, valeur `http://localhost:3001/auth/callback`.
5. Une fois créée, notez l'**ID d'application (client)** → `MS_CLIENT_ID`.
6. **Certificats et secrets** → **Nouveau secret client** → notez la
   **valeur** (pas l'ID) → `MS_CLIENT_SECRET`.
7. **API autorisées** → **Ajouter une autorisation** → **Microsoft Graph** →
   **Autorisations déléguées** → ajoutez `Mail.Read`, `Mail.ReadWrite`,
   `Mail.Send`, `User.Read`, `offline_access`.
8. Si votre organisation l'exige, cliquez **Accorder le consentement admin**
   (sinon vous consentirez vous-même à la première connexion).

Si vous utilisez un compte personnel (@outlook.com), laissez
`MS_TENANT_ID=common` dans le `.env`. Pour un compte d'entreprise avec
consentement admin requis, mettez plutôt l'ID de votre tenant.

## 2. Configurer le backend

```bash
cd backend
cp .env.example .env
npm install
```

Éditez `backend/.env` :

```
MS_CLIENT_ID=<id de l'application Azure>
MS_CLIENT_SECRET=<secret client>
MS_TENANT_ID=common
MS_REDIRECT_URI=http://localhost:3001/auth/callback

ANTHROPIC_API_KEY=<votre clé Anthropic>
CLASSIFY_MODEL=claude-opus-5
DRAFT_MODEL=claude-opus-5
```

> **Coût** : chaque mail est classé par un appel à Claude, et chaque
> génération de brouillon en fait un second. `claude-opus-5` donne la
> meilleure qualité ; pour réduire les coûts sur le tri (tâche simple), vous
> pouvez mettre `CLASSIFY_MODEL=claude-haiku-4-5` sans changer le modèle de
> rédaction des brouillons.

Lancer le backend :

```bash
npm run dev
```

Le serveur écoute sur `http://localhost:3001`.

## 3. Configurer le frontend

```bash
cd frontend
cp .env.example .env   # par défaut pointe vers http://localhost:3001
npm install
npm run dev
```

Ouvrez `http://localhost:5173`, cliquez sur **Se connecter à Outlook**,
autorisez l'application, vous revenez automatiquement sur le tableau.

## Utilisation

- Chaque mail de la boîte de réception est classé automatiquement à la
  première consultation (résultat mis en cache localement dans
  `backend/data/db.json`).
- Glissez-déposez une carte (ou ouvrez-la et choisissez une catégorie) pour
  corriger un classement — le choix manuel est mémorisé.
- Ouvrez un mail → **Générer un brouillon** : Claude regarde vos réponses
  précédentes envoyées au même expéditeur pour imiter votre style.
- Modifiez librement le texte généré, **Enregistrer** pour le garder sans
  l'envoyer, ou **Valider et envoyer** pour l'expédier réellement via votre
  compte Outlook (une confirmation est demandée).

## Limites de ce prototype

- Mono-utilisateur : une seule session Outlook active à la fois (le token
  est stocké dans `backend/data/msal-cache.json`).
- Le "RAG" sur vos réponses passées est volontairement simple (recherche des
  mails envoyés au même destinataire) plutôt qu'une recherche vectorielle —
  suffisant pour un usage personnel, à faire évoluer si besoin.
- Seule la boîte de réception principale (`Inbox`) est lue, pas les
  sous-dossiers.
- Pas d'authentification/permissions multi-utilisateur : à ne pas déployer
  tel quel sur un serveur partagé.

## Prochaines étapes possibles

- Pagination / actualisation automatique de la liste des mails.
- Recherche par embeddings sur l'historique envoyé pour un style plus fidèle.
- Règles de classification personnalisables (expéditeurs à toujours
  classer "à lire", etc.).
- Déploiement conteneurisé si un usage multi-utilisateur est souhaité.
