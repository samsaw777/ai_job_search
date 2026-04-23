from pydantic import SecretStr
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from app.config import get_settings


def get_groq_llm(temperature: float = 0):
    """Groq — free tier, used for parsing and decision making.
    Llama 3.3 70B is fast and great at structured extraction."""
    settings = get_settings()
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=temperature,
        api_key=SecretStr(settings.GROQ_API_KEY),
    )


def get_gemini_llm(temperature: float = 0):
    """Google Gemini — free tier, used for match scoring and analysis.
    2.5 Flash is good at reasoning tasks."""
    settings = get_settings()
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=temperature,
        google_api_key=settings.GOOGLE_API_KEY,
    )


def get_openai_llm(temperature: float = 0.7):
    """OpenAI — paid ($5 budget), used for writing tasks.
    GPT-4o-mini is cheap and great at drafting emails and rewriting bullets."""
    settings = get_settings()
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=temperature,
        api_key=SecretStr(settings.OPENAI_API_KEY),
    )