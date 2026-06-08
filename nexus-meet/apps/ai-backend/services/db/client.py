import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://nexusmeet:nexusmeet_dev@localhost:5432/nexusmeet_db"
)

# SQLAlchemy async engine
engine = create_async_engine(DATABASE_URL, echo=False, pool_size=10)

AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

class DBClient:
    async def connect(self):
        # Test connection on startup
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        print("DB connection verified")

    async def disconnect(self):
        await engine.dispose()

db_client = DBClient()