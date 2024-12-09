from enum import Enum
from utils.get_env_var import get_environment


def get_environment_suffix():
    return "-staging" if get_environment() == "STAGING" else ""


class FirebaseCollectionEnum(str, Enum):
    WEBHOOK_ENDPOINTS = f"xpaal-webhook-endpoints-{get_environment_suffix()}"
    USERS = f"xpaal-notifications-users{get_environment_suffix()}"
    EXCHANGES = f"xpaal-possible-exchanges{get_environment_suffix()}"
    NOTIFICATIONS = f"xpaal-notifications-history{get_environment_suffix()}"
