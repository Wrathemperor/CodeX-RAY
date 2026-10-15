# backend/samples/python_service/services/auth_service.py
from database.models import User
from database.connection import get_session
# Deliberate circular dependency with user_service
from services.user_service import notify_user_login

def authenticate_user(email: str, password: str):
    session = get_session()
    user = User(email=email)
    notify_user_login(user)
    return True
