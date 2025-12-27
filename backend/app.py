# backend/app.py
from app import create_app

app = create_app()  # Usa la funzione create_app definita in app/__init__.py

if __name__ == "__main__":
    print("⚡ Avvio del server Flask sulla porta 5000...")
    app.run(host="0.0.0.0", port=5000, debug=True)