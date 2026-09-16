from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
_client = None

def get_db():
    """Returns the database named in MONGO_URI itself - always stays in sync with .env,
    so we can never accidentally point at the wrong/empty database again."""
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI")
        if not uri:
            raise RuntimeError("MONGO_URI is not set - check that .env exists and python-dotenv is installed")
        _client = MongoClient(uri)
    return _client.get_default_database()
