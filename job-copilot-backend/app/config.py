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

    # Gemini keys — up to 5, rotated automatically on rate limit
    GOOGLE_API_KEY_1: str = ""
    GOOGLE_API_KEY_2: str = ""
    GOOGLE_API_KEY_3: str = ""
    GOOGLE_API_KEY_4: str = ""
    GOOGLE_API_KEY_5: str = ""

    @property
    def gemini_api_keys(self) -> list[str]:
        """Return all non-empty Gemini keys in order."""
        keys = [
            self.GOOGLE_API_KEY_1,
            self.GOOGLE_API_KEY_2,
            self.GOOGLE_API_KEY_3,
            self.GOOGLE_API_KEY_4,
            self.GOOGLE_API_KEY_5,
        ]
        return [k for k in keys if k.strip()]

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