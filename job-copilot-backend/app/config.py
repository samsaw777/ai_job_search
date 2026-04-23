from pydantic_settings import BaseSettings, SettingsConfigDict  # type: ignore
from functools import lru_cache


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── LLM API Keys ──
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # Gemini — up to 5 keys, rotated automatically on rate limit.
    # Also accepts the legacy GOOGLE_API_KEY as key 1.
    GOOGLE_API_KEY: str = ""
    GOOGLE_API_KEY_1: str = ""
    GOOGLE_API_KEY_2: str = ""
    GOOGLE_API_KEY_3: str = ""
    GOOGLE_API_KEY_4: str = ""
    GOOGLE_API_KEY_5: str = ""

    @property
    def gemini_api_keys(self) -> list[str]:
        """All non-empty Gemini keys in order (numbered keys first, legacy fallback)."""
        numbered = [
            self.GOOGLE_API_KEY_1,
            self.GOOGLE_API_KEY_2,
            self.GOOGLE_API_KEY_3,
            self.GOOGLE_API_KEY_4,
            self.GOOGLE_API_KEY_5,
        ]
        keys = [k for k in numbered if k.strip()]
        if not keys and self.GOOGLE_API_KEY.strip():
            keys = [self.GOOGLE_API_KEY]
        return keys

    # ── LangChain / LangSmith (optional, for tracing) ──
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_TRACING_V2: str = "false"
    LANGCHAIN_PROJECT: str = "job-copilot"
    LANGCHAIN_ENDPOINT: str = "https://api.smith.langchain.com"

    # ── Google Sheets ──
    GOOGLE_SERVICE_ACCOUNT_PATH: str = ""  # path to service account JSON key file
    GOOGLE_SHEETS_SPREADSHEET_ID: str = ""  # ID from the spreadsheet URL

    # ── App ──
    APP_NAME: str = "Job Copilot API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["*"]


@lru_cache()
def get_settings() -> Settings:
    return Settings()