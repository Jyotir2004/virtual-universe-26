from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
import os
import sqlite3
from typing import Literal

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator


Category = Literal["espresso", "tea", "bakery"]
DATABASE_PATH = Path(
    os.getenv("MENU_DATABASE_PATH", str(Path(__file__).with_name("menu.db")))
)
SEED_ITEMS = [
    ("Espresso", "Double shot, dark chocolate finish", 300, "espresso", 1),
    ("Oat Milk Latte", "Double espresso with steamed oat milk", 450, "espresso", 1),
    ("Maple Cappuccino", "Maple, cinnamon, and silky foam", 475, "espresso", 1),
    ("Jasmine Green", "Loose-leaf tea, steeped to order", 350, "tea", 1),
    ("Hibiscus Cooler", "Tart hibiscus over ice", 400, "tea", 1),
    ("Cardamom Bun", "Baked this morning, finished with sugar", 425, "bakery", 1),
]


class MenuItemInput(BaseModel):
    name: str = Field(min_length=2, max_length=40)
    note: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0, le=100)
    category: Category
    available: bool = True

    @field_validator("name", "note", mode="before")
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value


def item_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "note": row["note"],
        "price": row["price_cents"] / 100,
        "category": row["category"],
        "available": bool(row["available"]),
    }


def create_app(database_path: str | Path = DATABASE_PATH) -> FastAPI:
    path = Path(database_path)

    @contextmanager
    def database():
        path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(path)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def initialize_database() -> None:
        with database() as connection:
            connection.execute(
                """CREATE TABLE IF NOT EXISTS menu_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    note TEXT NOT NULL,
                    price_cents INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    available INTEGER NOT NULL DEFAULT 1
                )"""
            )
            count = connection.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0]
            if count == 0:
                connection.executemany(
                    """INSERT INTO menu_items
                    (name, note, price_cents, category, available)
                    VALUES (?, ?, ?, ?, ?)""",
                    SEED_ITEMS,
                )

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        initialize_database()
        yield

    api = FastAPI(title="Rill & Roast Menu API", version="1.0.0", lifespan=lifespan)
    api.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @api.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @api.get("/api/menu")
    def list_menu() -> list[dict]:
        with database() as connection:
            rows = connection.execute(
                "SELECT * FROM menu_items ORDER BY category, id"
            ).fetchall()
        return [item_from_row(row) for row in rows]

    @api.post("/api/menu", status_code=status.HTTP_201_CREATED)
    def create_menu_item(item: MenuItemInput) -> dict:
        with database() as connection:
            cursor = connection.execute(
                """INSERT INTO menu_items
                (name, note, price_cents, category, available)
                VALUES (?, ?, ?, ?, ?)""",
                (
                    item.name.strip(),
                    item.note.strip(),
                    round(item.price * 100),
                    item.category,
                    int(item.available),
                ),
            )
            row = connection.execute(
                "SELECT * FROM menu_items WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
        return item_from_row(row)

    @api.put("/api/menu/{item_id}")
    def update_menu_item(item_id: int, item: MenuItemInput) -> dict:
        with database() as connection:
            cursor = connection.execute(
                """UPDATE menu_items SET name = ?, note = ?, price_cents = ?,
                category = ?, available = ? WHERE id = ?""",
                (
                    item.name.strip(),
                    item.note.strip(),
                    round(item.price * 100),
                    item.category,
                    int(item.available),
                    item_id,
                ),
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Menu item not found")
            row = connection.execute(
                "SELECT * FROM menu_items WHERE id = ?", (item_id,)
            ).fetchone()
        return item_from_row(row)

    @api.delete("/api/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_menu_item(item_id: int) -> Response:
        with database() as connection:
            cursor = connection.execute("DELETE FROM menu_items WHERE id = ?", (item_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Menu item not found")
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return api


app = create_app()