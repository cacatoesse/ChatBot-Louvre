import requests
from bs4 import BeautifulSoup

URL = "https://www.louvre.fr/visiter/horaires-tarifs"


def normalize(s: str) -> str:
    return (
        s.replace("\xa0", " ")
        .replace("’", "'")
        .replace("\u202f", " ")  # espace fine insécable
        .lower()
        .strip()
    )


def extract_rows_from_table(table):
    """Extraction générique label/value depuis une table HTML."""
    rows = []
    for tr in table.select("tr"):
        # On récupère toutes les cellules (th et td)
        cells = tr.find_all(["th", "td"])
        cells_text = [c.get_text(" ", strip=True) for c in cells if c.get_text(strip=True)]

        if len(cells_text) >= 2:
            label = cells_text[0]
            value = " ".join(cells_text[1:])
            rows.append({"label": label, "value": value})

    return rows


def get_tarifs_louvre():
    r = requests.get(URL, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)

    if r.status_code != 200:
        return {
            "source": "louvre_tarifs",
            "status_code": r.status_code,
            "final_url": r.url,
            "error": "Page non trouvée ou inaccessible",
        }

    soup = BeautifulSoup(r.text, "html.parser")

    # 1) On cherche parmi TOUTES les tables
    tables = soup.find_all("table")

    candidates = []
    for table in tables:
        caption = table.find("caption")
        cap_text = caption.get_text(" ", strip=True) if caption else ""
        norm_cap = normalize(cap_text)

        # Recherche plus souple : mot-clé dans le titre OU présence du symbole €
        if "tarif" in norm_cap or "prix" in norm_cap or "€" in table.get_text():
            candidates.append(table)

    if not candidates:
        # debug : captions existantes
        captions = []
        for table in tables:
            caption = table.find("caption")
            if caption:
                captions.append(caption.get_text(" ", strip=True))
        return {
            "source": "louvre_tarifs",
            "status_code": r.status_code,
            "error": "Aucun tableau de tarifs trouvé (recherche par caption ou symbole €)",
            "captions_found": captions,
        }

    # 2) On parse la/les tables candidates
    all_tarifs = []
    for t in candidates:
        all_tarifs.extend(extract_rows_from_table(t))

    # dédoublonnage simple
    seen = set()
    tarifs = []
    for item in all_tarifs:
        key = (item["label"], item["value"])
        if key not in seen:
            seen.add(key)
            tarifs.append(item)

    return {"source": "louvre_tarifs", "status_code": r.status_code, "data": tarifs}


if __name__ == "__main__":
    print(get_tarifs_louvre())
