# backend/samples/python_service/api/routes.py
from services.auth_service import authenticate_user
from services.user_service import get_user_profile

def app_router():
    return {"/login": authenticate_user, "/profile": get_user_profile}
