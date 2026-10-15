# backend/samples/python_service/main.py
from api.routes import app_router
from database.connection import init_db

def main():
    init_db()
    print("Python Service running...")

if __name__ == "__main__":
    main()
