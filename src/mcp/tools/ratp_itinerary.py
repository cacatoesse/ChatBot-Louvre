import requests
import os

API_KEY = os.getenv("IDFM_API_KEY")

BASE_URL = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys"

def get_itinerary(from_place: str, to_place: str):
    headers = {"Authorization": API_KEY}

    params = {
        "from": from_place,
        "to": to_place,
        "datetime_represents": "departure"
    }

    r = requests.get(BASE_URL, headers=headers, params=params, timeout=20)

    if r.status_code != 200:
        return {"error": "Impossible de calculer l’itinéraire."}

    data = r.json()
    journey = data["journeys"][0]

    steps = []

    for section in journey["sections"]:
        if section["type"] == "public_transport":
            info = section["display_informations"]

            mode = info.get("commercial_mode", "")
            line = info.get("label", "")
            direction = info.get("direction", "")

            steps.append(
                f"🚏 {section['from']['name']} → {section['to']['name']}<br>"
                f"➡️ {mode} {line} direction {direction}"
            )

        elif section["type"] == "street_network":
            if section.get("mode") == "walking":
                steps.append(f"🚶 Marche : {int(section['duration'] / 60)} min")

    return {
        "duration": journey["duration"] // 60,
        "steps": steps
    }
# Exemple d'utilisation
# itinerary = get_itinerary("stop_area:OIF:SA:8778600", "stop_area:OIF:SA:8778601")
# print(itinerary)