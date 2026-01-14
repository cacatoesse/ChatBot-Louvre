import os
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

URL = "https://www.louvre.fr/expositions-et-evenements/evenements-activites"
BASE = "https://www.louvre.fr"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

def fetch_html(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.text

def parse_events(html: str, limit: int = 20):
    soup = BeautifulSoup(html, "html.parser")

    results = []
    total = 0

    # Chaque bloc de mois
    months = soup.select("div.MonthSeparator")
    print("Mois détectés :", len(months))

    for month_block in months:
        month_title = month_block.select_one(".MonthSeparator_title")
        month_name = month_title.get_text(strip=True) if month_title else "Mois inconnu"

        events = []
        # Les cartes événement (dans le bloc du mois)
        for ev in month_block.select("div.Events_Event"):
            if total >= limit:
                break

            # Titre + lien
            a = ev.select_one("h4.Events_Event_title a.Events_Event_link")
            title = a.get_text(strip=True) if a else None
            url = urljoin(BASE, a["href"]) if (a and a.has_attr("href")) else None

            # Date / période (2 cas : texte direct ou sr-only)
            date = None
            date_sr = ev.select_one("h3.Events_Event_date .sr-only")
            if date_sr:
                date = date_sr.get_text(strip=True)
            else:
                date_h3 = ev.select_one("h3.Events_Event_date")
                date = date_h3.get_text(" ", strip=True) if date_h3 else None

            # Slot (ex: "En nocturne")
            slot_tag = ev.select_one("p.Events_Event_slot")
            slot = slot_tag.get_text(" ", strip=True) if slot_tag else None

            # Tags (catégories)
            tags = [t.get_text(" ", strip=True) for t in ev.select(".EventTagsList_EventTag")]

            # Description (optionnel)
            desc_tag = ev.select_one(".Events_Event_description")
            description = desc_tag.get_text(" ", strip=True) if desc_tag else None

            # Image (optionnel)
            img = ev.select_one("img.Events_Event_image")
            image_url = img["src"] if (img and img.has_attr("src")) else None

            if not title:
                # Si pas de titre, on skip
                continue

            event_obj = {
                "title": title,
                "date": date,
                "slot": slot,
                "tags": tags,
                "url": url,
                "image": image_url,
                "description": description,
            }

            events.append(event_obj)
            total += 1

        if events:
            results.append({
                "month": month_name,
                "events": events
            })

        if total >= limit:
            break

    return {
        "source": "louvre_evenements_page",
        "url": URL,
        "count": total,
        "data": results
    }

def main():
    limit = int(os.getenv("LIMIT", "10"))  # tu peux faire: LIMIT=20 python3 louvre_events_html.py
    html = fetch_html(URL)
    payload = parse_events(html, limit=limit)

    # Aperçu terminal
    print("\nAperçu :")
    for m in payload["data"]:
        print(f"\n== {m['month']} ==")
        for e in m["events"]:
            print(f"- {e['title']} | {e['date']} | {', '.join(e['tags'])} | {e['url']}")

    # JSON complet
    print("\n\nJSON (API) :\n")
    print(json.dumps(payload, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

