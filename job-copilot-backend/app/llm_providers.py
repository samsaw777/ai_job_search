import threading
from pydantic import SecretStr
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from app.config import get_settings

# ── Gemini key rotation state ─────────────────────────────────────────────────
# Shared across all requests; lock makes rotation thread-safe.
_gemini_lock = threading.Lock()
_gemini_key_index = 0


def _is_rate_limit_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(kw in msg for kw in ("429", "quota", "rate limit", "resource exhausted", "resourceexhausted"))


class _GeminiWithFallback:
    """
    Drop-in replacement for a LangChain LLM object.
    Calls .invoke() with the current Gemini key; on a rate-limit error it
    rotates to the next key and retries — cycling through all available keys
    before giving up.
    """

    def __init__(self, temperature: float, keys: list[str]):
        self._temperature = temperature
        self._keys = keys

    def _make_llm(self, key: str) -> ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=self._temperature,
            google_api_key=key,
        )

    def invoke(self, messages):
        global _gemini_key_index

        keys = self._keys
        if not keys:
            raise RuntimeError("No Gemini API keys configured. Add GOOGLE_API_KEY_1 … _5 to your .env")

        with _gemini_lock:
            start_index = _gemini_key_index

        # Try every key starting from the current one
        for attempt in range(len(keys)):
            with _gemini_lock:
                idx = _gemini_key_index
            key = keys[idx]

            try:
                print(f"[GEMINI] Using key #{idx + 1}")
                return self._make_llm(key).invoke(messages)

            except Exception as exc:
                if _is_rate_limit_error(exc):
                    next_idx = (idx + 1) % len(keys)
                    with _gemini_lock:
                        # Only advance if another thread hasn't already moved past us
                        if _gemini_key_index == idx:
                            _gemini_key_index = next_idx
                    print(f"[GEMINI] Key #{idx + 1} rate-limited — rotating to key #{next_idx + 1}")
                    if next_idx == start_index:
                        # Completed a full rotation with no success
                        raise RuntimeError("All Gemini API keys are rate-limited. Try again later.") from exc
                else:
                    raise  # Non-rate-limit error — don't swallow it

        raise RuntimeError("All Gemini API keys are rate-limited. Try again later.")


# ── Public factories ───────────────────────────────────────────────────────────

def get_groq_llm(temperature: float = 0):
    settings = get_settings()
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=temperature,
        api_key=SecretStr(settings.GROQ_API_KEY),
    )


def get_gemini_llm(temperature: float = 0) -> _GeminiWithFallback:
    """Returns a Gemini wrapper that auto-rotates through all configured keys
    on rate-limit errors. Behaves like a LangChain LLM (has .invoke())."""
    settings = get_settings()
    keys = settings.gemini_api_keys
    if not keys:
        raise RuntimeError(
            "No Gemini API keys found. Set GOOGLE_API_KEY_1 (through _5) in your .env"
        )
    return _GeminiWithFallback(temperature=temperature, keys=keys)


def get_openai_llm(temperature: float = 0.7):
    settings = get_settings()
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=temperature,
        api_key=SecretStr(settings.OPENAI_API_KEY),
    )
