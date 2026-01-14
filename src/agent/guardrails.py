import re

def is_insulting(prompt: str) -> bool:
    """
    This function checks if a prompt contains insults.
    """
    insults = [
        "nique",
        "fils de pute",
        "batard",
        "con",
        "connard",
        "salope",
        "pétasse",
        "pute",
        "encul"
    ]
    for insult in insults:
        if re.search(r"\b" + insult + r"\b", prompt, re.IGNORECASE):
            return True
    return False
