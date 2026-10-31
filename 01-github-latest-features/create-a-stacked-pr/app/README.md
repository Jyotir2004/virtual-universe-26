# Rill & Roast Menu

A small full-stack cafe menu manager built with FastAPI, SQLite, and React. The
API seeds the menu on first run; edits are persisted in `backend/menu.db`.

## Run locally

Start the API in one terminal:

```bash
cd 01-github-latest-features/create-a-stacked-pr/app
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

Start the React app in a second terminal:

```bash
cd 01-github-latest-features/create-a-stacked-pr/app/frontend
npm install
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`. The development
server forwards `/api` requests to FastAPI on port `8000`. FastAPI's interactive
API docs are at `http://localhost:8000/docs`.

## Test the API

```bash
cd 01-github-latest-features/create-a-stacked-pr/app/backend
pip install pytest httpx
pytest
```

Set `MENU_DATABASE_PATH` to use a different SQLite file. The menu endpoints
support listing, adding, updating, and removing items under `/api/menu`.