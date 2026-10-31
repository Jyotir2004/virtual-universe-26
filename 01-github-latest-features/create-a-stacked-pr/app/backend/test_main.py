from fastapi.testclient import TestClient

from main import create_app


def test_menu_crud(tmp_path):
    app = create_app(tmp_path / "menu.db")
    with TestClient(app) as client:
        initial = client.get("/api/menu")
        assert initial.status_code == 200
        assert any(item["name"] == "Espresso" for item in initial.json())

        created = client.post(
            "/api/menu",
            json={
                "name": "Vanilla Cold Brew",
                "note": "Slow-steeped with vanilla",
                "price": 4.75,
                "category": "espresso",
                "available": True,
            },
        )
        assert created.status_code == 201
        item = created.json()
        assert item["price"] == 4.75

        updated = client.put(
            f"/api/menu/{item['id']}",
            json={**item, "available": False},
        )
        assert updated.status_code == 200
        assert updated.json()["available"] is False

        deleted = client.delete(f"/api/menu/{item['id']}")
        assert deleted.status_code == 204
        assert client.delete(f"/api/menu/{item['id']}").status_code == 404


def test_menu_validation(tmp_path):
    app = create_app(tmp_path / "menu.db")
    with TestClient(app) as client:
        response = client.post(
            "/api/menu",
            json={
                "name": "X",
                "note": "Too short",
                "price": 0,
                "category": "espresso",
                "available": True,
            },
        )
        blank_name = client.post(
            "/api/menu",
            json={
                "name": "   ",
                "note": "Trimmed names cannot be blank",
                "price": 3.50,
                "category": "espresso",
                "available": True,
            },
        )
    assert response.status_code == 422
    assert blank_name.status_code == 422