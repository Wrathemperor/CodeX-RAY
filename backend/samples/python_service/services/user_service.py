# backend/samples/python_service/services/user_service.py
from database.models import User
from utils.helpers import sanitize_username
# Deliberate circular dependency back to auth_service
from services.auth_service import authenticate_user

def get_user_profile(user_id: int):
    return {"id": user_id, "name": "Alice"}

def notify_user_login(user: User):
    print(f"User {user.email} logged in")
