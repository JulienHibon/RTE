"""
LinkedIn auto-publisher — lit LINKEDIN_POSTS.md, publie le prochain post non publié.

Secrets GitHub requis :
  LINKEDIN_ACCESS_TOKEN  — OAuth 2.0 token (scope : w_member_social)
  LINKEDIN_PERSON_ID     — ID de la personne LinkedIn (sans le préfixe urn:li:person:)

Pour obtenir votre LINKEDIN_PERSON_ID :
  GET https://api.linkedin.com/v2/userinfo  (avec votre access token)
  Le champ "sub" est votre person ID.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

POSTS_FILE = "LINKEDIN_POSTS.md"
STATUS_FILE = "posts_status.json"
LINKEDIN_API_URL = "https://api.linkedin.com/v2/ugcPosts"


def parse_posts(filepath: str) -> list[str]:
    content = Path(filepath).read_text(encoding="utf-8")

    # Découpe sur les titres de section "## Post N"
    sections = re.split(r"^## Post \d+.*$", content, flags=re.MULTILINE)

    posts = []
    for section in sections[1:]:
        lines = section.strip().splitlines()
        sep_indices = [i for i, line in enumerate(lines) if line.strip() == "---"]

        if len(sep_indices) >= 1:
            # Le contenu publiable commence après le 1er séparateur ---
            # et se termine avant le dernier si il y en a plusieurs, sinon jusqu'à la fin
            start = sep_indices[0] + 1
            end = sep_indices[-1] if len(sep_indices) >= 2 else len(lines)
            post_lines = lines[start:end]
            post_text = "\n".join(post_lines).strip()
            # Déséchappe les # que Markdown force à précéder d'un \
            post_text = post_text.replace("\\#", "#")
            posts.append(post_text)

    return posts


def load_status(filepath: str) -> dict:
    if Path(filepath).exists():
        return json.loads(Path(filepath).read_text(encoding="utf-8"))
    return {"posts": []}


def save_status(filepath: str, status: dict) -> None:
    Path(filepath).write_text(
        json.dumps(status, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def publish_to_linkedin(text: str, access_token: str, person_id: str) -> dict:
    payload = {
        "author": f"urn:li:person:{person_id}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }

    response = requests.post(LINKEDIN_API_URL, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def main() -> None:
    access_token = os.environ.get("LINKEDIN_ACCESS_TOKEN")
    person_id = os.environ.get("LINKEDIN_PERSON_ID")

    if not access_token or not person_id:
        print("Erreur : LINKEDIN_ACCESS_TOKEN et LINKEDIN_PERSON_ID sont requis.")
        sys.exit(1)

    posts = parse_posts(POSTS_FILE)
    if not posts:
        print("Aucun post trouvé dans LINKEDIN_POSTS.md.")
        sys.exit(1)

    status = load_status(STATUS_FILE)

    # Synchronise le tableau de statut avec le nombre réel de posts
    while len(status["posts"]) < len(posts):
        i = len(status["posts"])
        status["posts"].append({"index": i, "published": False, "published_at": None, "linkedin_id": None})

    # Cherche le prochain post non publié
    next_post = next((p for p in status["posts"] if not p["published"]), None)

    if next_post is None:
        print("Tous les posts ont déjà été publiés.")
        sys.exit(0)

    idx = next_post["index"]
    print(f"Publication du post {idx + 1}/{len(posts)}...")
    print("---")
    print(posts[idx][:200], "...")
    print("---")

    result = publish_to_linkedin(posts[idx], access_token, person_id)

    next_post["published"] = True
    next_post["published_at"] = datetime.now(timezone.utc).isoformat()
    next_post["linkedin_id"] = result.get("id", "")

    save_status(STATUS_FILE, status)
    print(f"Post {idx + 1} publié avec succès ! ID LinkedIn : {next_post['linkedin_id']}")


if __name__ == "__main__":
    main()
