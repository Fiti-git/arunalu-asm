"""
Groq client + tool-calling loop.

Flow:
  1. Send user question + tool schemas to Groq.
  2. If model asks for a tool, run it locally against Django ORM.
  3. Send tool result back to model.
  4. Repeat until model returns final natural-language answer (max N rounds).
"""
import json
import os
import time

import requests
from django.contrib.auth.models import User

from .tools import all_schemas, run_tool

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_TIMEOUT = 25
MAX_TOOL_ROUNDS = 4

BASE_SYSTEM_PROMPT = (
    "You are the Arunalu ASM assistant — a concise helper for managers and admins of "
    "Arunalu Supermarket's Attendance & Staff Management system.\n\n"
    "Rules:\n"
    "- Use the provided tools to answer questions about attendance, leaves, and outlets. "
    "Never invent numbers, names, or dates.\n"
    "- If a question cannot be answered with the available tools, say so plainly.\n"
    "- Keep answers short. Prefer compact tables or bullet lists for multi-row data.\n"
    "- Dates default to today (Asia/Colombo). Resolve relative dates before calling a tool.\n"
    "- Employee names are stored in English (Latin script). Do not transliterate them."
)

LANGUAGE_DIRECTIVES = {
    "auto": "Respond in the same language the user used (English / Sinhala / Tamil). "
            "If the user mixes languages, follow the dominant one.",
    "en": "Respond in English only.",
    "si": "Respond in Sinhala (සිංහල) using Sinhala script. "
          "Keep employee names, outlet names, dates, and numbers in their original form. "
          "Use natural, polite Sinhala suitable for a workplace assistant.",
    "ta": "Respond in Tamil (தமிழ்) using Tamil script. "
          "Keep employee names, outlet names, dates, and numbers in their original form.",
}


def _system_prompt(language: str) -> str:
    directive = LANGUAGE_DIRECTIVES.get(language, LANGUAGE_DIRECTIVES["auto"])
    return f"{BASE_SYSTEM_PROMPT}\n- {directive}"


def ask(question: str, user: User, language: str = "auto") -> dict:
    """
    Returns: {answer, tools_used, tokens, latency_ms, error}
    language: 'auto' | 'en' | 'si' | 'ta'
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"answer": "", "tools_used": [], "tokens": 0,
                "latency_ms": 0, "error": "GROQ_API_KEY not set"}

    messages = [
        {"role": "system", "content": _system_prompt(language)},
        {"role": "user", "content": question},
    ]
    tools = all_schemas()
    tools_used = []
    total_tokens = 0
    started = time.time()

    for _ in range(MAX_TOOL_ROUNDS):
        try:
            resp = requests.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {api_key}",
                         "Content-Type": "application/json"},
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "tools": tools,
                    "tool_choice": "auto",
                    "temperature": 0.2,
                },
                timeout=GROQ_TIMEOUT,
            )
        except requests.RequestException as e:
            return {"answer": "", "tools_used": tools_used, "tokens": total_tokens,
                    "latency_ms": int((time.time() - started) * 1000),
                    "error": f"Network error: {e}"}

        if resp.status_code != 200:
            return {"answer": "", "tools_used": tools_used, "tokens": total_tokens,
                    "latency_ms": int((time.time() - started) * 1000),
                    "error": f"Groq {resp.status_code}: {resp.text[:300]}"}

        data = resp.json()
        total_tokens += data.get("usage", {}).get("total_tokens", 0)
        msg = data["choices"][0]["message"]

        tool_calls = msg.get("tool_calls") or []
        if not tool_calls:
            # Final answer
            return {
                "answer": msg.get("content", "").strip(),
                "tools_used": tools_used,
                "tokens": total_tokens,
                "latency_ms": int((time.time() - started) * 1000),
                "error": "",
            }

        # Echo assistant message (with the tool_calls) into history
        messages.append({
            "role": "assistant",
            "content": msg.get("content") or "",
            "tool_calls": tool_calls,
        })

        # Run each tool, append result
        for call in tool_calls:
            fn_name = call["function"]["name"]
            try:
                args = json.loads(call["function"].get("arguments") or "{}")
            except json.JSONDecodeError:
                args = {}
            result = run_tool(fn_name, args, user=user)
            tools_used.append({"name": fn_name, "args": args})
            messages.append({
                "role": "tool",
                "tool_call_id": call["id"],
                "name": fn_name,
                "content": json.dumps(result, default=str),
            })

    return {"answer": "I couldn't reach a conclusion within the tool-call limit.",
            "tools_used": tools_used, "tokens": total_tokens,
            "latency_ms": int((time.time() - started) * 1000),
            "error": "tool_round_limit"}
