# backend/samples/python_service/utils/helpers.py
def sanitize_username(name: str) -> str:
    return name.strip().lower()
