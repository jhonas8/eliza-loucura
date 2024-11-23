import os
import base64
import json

from firebase_admin import credentials, initialize_app
from utils.get_env_var import get_env_var


def authenticate_firebase():
    # Load environment variables from .env file in local environment

    # Get the base64 encoded secret and decode it
    encoded_secret = get_env_var(f'FIREBASE_SECRET_PAAL_BASE64')

    firebase_secret_json = base64.b64decode(encoded_secret).decode('utf-8')

    # Convert the JSON string to a dictionary
    firebase_secret_data = json.loads(firebase_secret_json)

    # Use the dictionary data to authenticate
    cred = credentials.Certificate(firebase_secret_data)

    try:
        print(f"Initializing Firebase app")
        # App doesn't exist, initialize the app with the desired client name
        initialize_app(cred, {
            'storageBucket': 'fevercall.appspot.com'
        })
        print(f"Firebase app initialized")
    except ValueError:
        print(f"Firebase app already initialized")
