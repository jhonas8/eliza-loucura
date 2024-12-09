from enum import Enum
from utils.get_env_var import get_environment


class TargetTypeEnum(str, Enum):
    USER = "USER"
    SERVICE = "SERVICE"
