from typing import Optional
from dotenv import load_dotenv

load_dotenv(override=True)


def get_env_var(variable_name: str, fallback: Optional[str] = None) -> str:
    import os

    variable_value = os.getenv(variable_name)

    if not variable_value:
        if fallback:
            return fallback
        raise ValueError(f"Environment variable {variable_name} not set")

    return variable_value


def get_environment():
    return get_env_var("ENV", "PRODUCTION")
