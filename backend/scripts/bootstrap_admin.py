import argparse
import asyncio
import getpass

from sqlalchemy import select, text

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models import User
from app.schemas import UserCreate


async def bootstrap(body: UserCreate):
    async with AsyncSessionLocal() as db, db.begin():
        # Serialize first-account bootstrap; never expose a public provisioning route.
        await db.execute(text("SELECT pg_advisory_xact_lock(871021)"))
        if await db.scalar(select(User.id).where(User.role == "admin", User.is_active)):
            raise ValueError("An active administrator already exists; use admin API")
        db.add(
            User(
                **body.model_dump(exclude={"password"}),
                password_hash=hash_password(body.password),
            )
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--full-name", required=True)
    args = parser.parse_args()
    password = getpass.getpass("Initial administrator password: ")
    if password != getpass.getpass("Confirm password: "):
        parser.error("Passwords differ")
    asyncio.run(
        bootstrap(
            UserCreate(
                username=args.username.lower(),
                email=args.email.lower(),
                full_name=args.full_name,
                password=password,
                role="admin",
            )
        )
    )
