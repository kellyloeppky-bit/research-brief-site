import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-in-production")
    SESSION_TYPE = os.getenv("SESSION_TYPE", "filesystem")
    SESSION_COOKIE_SAMESITE = "Lax"
    # Secure cookies in production (HTTPS), insecure in local dev
    SESSION_COOKIE_SECURE = os.getenv("FLASK_DEBUG", "False") != "True"
    PERMANENT_SESSION_LIFETIME = 86400
    DEBUG = os.getenv("FLASK_DEBUG", "False") == "True"

    # Auth0
    AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
    AUTH0_CLIENT_ID = os.getenv("AUTH0_CLIENT_ID")
    AUTH0_CLIENT_SECRET = os.getenv("AUTH0_CLIENT_SECRET")
    AUTH0_CALLBACK_URL = os.getenv("AUTH0_CALLBACK_URL")
    AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "")

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")

    # Contact
    CONTACT_EMAIL = os.getenv("CONTACT_EMAIL")