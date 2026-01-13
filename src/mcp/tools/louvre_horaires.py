import requests
from bs4 import BeautifulSoup

URL = "https://www.louvre.fr/visiter/horaires-tarifs"

def get_horaires_louvre():
    r = requests.get(
        URL,
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=20
    )

    if r.status_code != 200:
        return {
            "source": "louvre_horaires",
            "status_code": r.status_code,
            "final_url": r.url,
            "error": "Page non trouvée ou inaccessible"
        }

    soup = BeautifulSoup(r.text, "html.parser")

    # On cible la liste qui contient les horaires
    ul = soup.select_one("ul.Table_Horaires_list")
    if not ul:
        return {
            "source": "louvre_horaires",
            "status_code": r.status_code,
            "error": "Bloc des horaires introuvable (structure HTML modifiée?)"
        }

    horaires = []
    for li in ul.select("li.Horaires_Horaire"):
        top = li.select_one(".Horaires_Horaire_top")
        bottom = li.select_one(".Horaires_Horaire_bottom")

        top_text = top.get_text(" ", strip=True) if top else ""
        bottom_text = bottom.get_text(" ", strip=True) if bottom else ""

        # Normalisation simple (ex: "9h 18h" ou "Fermé")
        horaires.append({
            "plage": top_text,
            "jours": bottom_text
        })

    return {
        "source": "louvre_horaires",
        "status_code": r.status_code,
        "data": horaires
    }

if __name__ == "__main__":
    print(get_horaires_louvre())
