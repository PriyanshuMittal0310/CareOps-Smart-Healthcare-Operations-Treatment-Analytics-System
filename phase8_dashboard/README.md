# CareOps Dashboard (Phase 8)

This module provides a web-based analytics dashboard for the CareOps data warehouse.

It includes:
- React + Vite frontend for KPI and trend visualization
- Node.js + Express API layer
- MySQL connectivity to both `careops_dw` and `careops_oltp`

## Architecture

```text
Browser (React/Vite)
	-> /api/*
Node API (Express)
	-> careops_dw (analytics data)
	-> careops_oltp (alert log)
```

## Folder Structure

```text
phase8_dashboard/
├── src/                 # React frontend
├── server/              # Express API backend
├── package.json         # Frontend scripts and dependencies
└── vite.config.js       # Vite proxy and build config
```

## Prerequisites

1. Node.js 18+ and npm installed.
2. MySQL 8.x running locally or accessible over network.
3. Core project pipeline completed at least through Phase 6 so dashboard has data.

## Install Dependencies

From `phase8_dashboard`:

```bash
npm install
cd server
npm install
```

## Backend Configuration

Create a file named `.env` inside `phase8_dashboard/server/` with your database settings:

```text
PORT=4000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DW_DATABASE=careops_dw
MYSQL_OLTP_DATABASE=careops_oltp
```

If `.env` is not provided, the server falls back to built-in defaults.

## Run Locally

From `phase8_dashboard`:

1. Start backend API:

```bash
npm run server
```

2. In a separate terminal, start frontend:

```bash
npm run dev
```

3. Open the app:

```text
http://localhost:5173
```

## Available Scripts

Frontend (`phase8_dashboard/package.json`):
- `npm run dev` - start Vite development server
- `npm run build` - create production build
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint checks
- `npm run server` - start API server from project root

Backend (`phase8_dashboard/server/package.json`):
- `npm run start` - start API server
- `npm run dev` - start API server with watch mode (nodemon)

## API Endpoints

Primary endpoints exposed by the backend:
- `GET /api/meta`
- `GET /api/overview`
- `GET /api/trend-monthly`
- `GET /api/disease-burden`
- `GET /api/doctor-performance`
- `GET /api/ward-utilization`
- `GET /api/readmission`
- `GET /api/alerts`

The frontend uses Vite proxying for `/api/*` calls to `http://localhost:4000`.

## Demo Readiness Checklist

1. Ensure `careops_dw` and `careops_oltp` both contain populated tables.
2. Confirm backend starts without DB authentication errors.
3. Verify KPI cards and charts render data for the selected date range.
4. Keep API and frontend running in separate terminals during presentation.
