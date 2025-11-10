import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Configurazione di base"""
    SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key")
    DEBUG = False
    UPLOAD_FOLDER = "instance/uploads"
    # Connessione al database SQLite creato manualmente:
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(basedir,"database", "TAT_Database.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    NVD_API_KEY="d6b14f53-786d-43ed-aa5c-1891a58faea6"

class DevelopmentConfig(Config):
    """Configurazione per l'ambiente di sviluppo"""
    DEBUG = True

class ProductionConfig(Config):
    """Configurazione per l'ambiente di produzione"""
    DEBUG = False

# Dizionario per selezionare la configurazione in base all'ambiente
config_dict = {
    "development": DevelopmentConfig,
    "production": ProductionConfig
}

def get_config(config_name="development"):
    """Restituisce la configurazione corretta in base all'ambiente"""
    return config_dict.get(config_name, DevelopmentConfig)
