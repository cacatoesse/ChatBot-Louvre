from mcp.tools.louvre_horaires import get_horaires_louvre

def call_tool(tool_name: str):
    """
    Simule un serveur MCP :
    - reçoit un nom de tool
    - exécute le tool correspondant
    - renvoie le résultat
    """
    if tool_name == "get_horaires_louvre":
        return get_horaires_louvre()

    return {"error": f"Tool inconnu: {tool_name}"}


if __name__ == "__main__":
    # Test local
    print(call_tool("get_horaires_louvre"))
