# KisanConnect

A digital procurement and farmer support platform built for the IBM Hackathon.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Python FastAPI
- Database: SQLite

## Project structure

- `frontend/` – React application
- `backend/` – FastAPI app and SQLite database

## Run locally

1. Open a terminal in the project root.
2. Start the backend from the backend folder using the virtual environment:
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   $env:DATABASE_URL = "sqlite:///./kisanconnect.db"
   uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```
3. Open a second terminal in the project root.
4. Start the frontend:
   ```powershell
   cd frontend
   npm install
   npm run dev -- --host 0.0.0.0
   ```
5. Open the browser at `http://localhost:5173`.

> Note: port 8000 is already occupied on this machine, so the app uses port 8001 for the FastAPI backend.

## Public deployment

The recommended public deployment uses a Vercel frontend, a Render FastAPI
service, and a Neon PostgreSQL database.

1. Create a PostgreSQL database in Neon and copy its connection string. Use the
   pooled connection string with `sslmode=require`.
2. Push this repository to GitHub, then create a Render Blueprint from it.
   Render reads [`render.yaml`](./render.yaml); set `DATABASE_URL` to the Neon
   connection string when prompted.
3. After the Render service is live, verify its `/api/health` endpoint and copy
   the service URL (for example, `https://kisanconnect-api.onrender.com`).
4. Import the same GitHub repository into Vercel and set the project root
   directory to `frontend`. Add the environment variable
   `VITE_API_URL` with the Render service URL (no trailing slash), then deploy.
5. For subsequent frontend changes, redeploy the Vercel project. For backend
   changes, redeploy the Render service.

The frontend reads `VITE_API_URL` at build time. The backend requires
`DATABASE_URL` at startup; the local SQLite database is not suitable for a
persistent public deployment.

## Demo credentials

- Farmer login example: `9876543210` / `password123`
- Admin login example: `admin@kisanconnect.in` / `admin123`

## Notes

- The SQLite database file is created automatically when the backend starts.
- Demo data is seeded on first run for faster testing.
