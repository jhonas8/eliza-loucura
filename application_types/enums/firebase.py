from enum import Enum


class FirebaseCollectionEnum(str, Enum):
    USERS = "xpaal-notifications-users"
    EXCHANGES = "xpaal-possible-exchanges"
    NOTIFICATIONS = "xpaal-notifications-history"
