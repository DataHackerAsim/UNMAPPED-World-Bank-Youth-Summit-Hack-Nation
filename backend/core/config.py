from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Auth
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    admin_username: str = "admin"
    admin_password: str = "admin"

    # Database
    database_url: str = "sqlite:///./worldbank.db"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    ollama_vision_model: str = "llava:7b"

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "worker-photos"
    minio_secure: bool = False

    # Retrieval — hybrid architecture
    embedding_model: str = "all-MiniLM-L6-v2"
    retrieval_confidence_threshold: float = 0.15
    retrieval_top_k_esco: int = 5
    retrieval_top_k_onet: int = 3

    # App
    min_completeness_score: float = 0.4
    max_photos_per_profile: int = 3
    presigned_url_expiry_hours: int = 1

    class Config:
        env_file = ".env"


settings = Settings()
