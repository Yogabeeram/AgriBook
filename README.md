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

## Demo credentials

- Farmer login example: `9876543210` / `password123`
- Admin login example: `admin@kisanconnect.in` / `admin123`

## Notes

- The SQLite database file is created automatically when the backend starts.
- Demo data is seeded on first run for faster testing.
