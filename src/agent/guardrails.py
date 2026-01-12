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
    ]
    for insult in insults:
        if re.search(r"\b" + insult + r"\b", prompt, re.IGNORECASE):
            return True
    return False

def moderate_prompt(prompt: str) -> str:
    """
    This function moderates a prompt to remove insults.
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
    ]
    for insult in insults:
        prompt = re.sub(r"\b" + insult + r"\b", "[censored]", prompt, flags=re.IGNORECASE)
    return prompt
