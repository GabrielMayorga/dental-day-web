# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, port 5173)
npm run build     # Production build
npm run lint      # ESLint check
npm run preview   # Preview production build locally
```

There are no tests configured yet.

## Environment

Copy `.env.example` to `.env`. The only variable is:

```
VITE_API_URL=http://localhost:4000/api/v1
```

All Vite env vars must be prefixed with `VITE_` to be accessible in the browser.

## Architecture

**Stack:** React 19 + Vite + Material UI v9 + React Router v7 + Axios.

**Auth flow:** JWT token stored in `localStorage`. On app load, `AuthContext` calls `GET /auth/me` to rehydrate the session. The axios client in `src/api/client.js` attaches the token via a request interceptor and redirects to `/login` on 401 responses. `ProtectedRoute` guards all private routes by reading from `AuthContext`.

**Route structure (App.jsx):**
- `/login` — public, renders `LoginPage` without `Layout`
- `/*` — private, wrapped in `ProtectedRoute` → `Layout` (sidebar + header + `<Outlet />`)

**Layout:** `Layout.jsx` renders a permanent MUI `Drawer` (240px) on the left and a sticky `AppBar` on top. The active page is injected via `<Outlet />`. Navigation items are driven by `src/config/navigation.js`, which also declares which `roles` (`admin`, `dentist`, `receptionist`) can see each module. The sidebar filters `navItems` by `user.role` at render time.

**Adding a new page/module:**
1. Create `src/pages/YourPage.jsx`
2. Add an entry to `src/config/navigation.js` with the path, icon, label, and allowed roles
3. Register the route inside the private `<Route>` block in `App.jsx`
4. Add API calls (if any) to a new file under `src/api/`

**API layer (`src/api/`):**
- `client.js` — configured axios instance; never import axios directly in pages/components
- `auth.js` — `/auth/login`, `/auth/me`
- `patients.js` — CRUD for `/patients`

Backend responses follow `{ message, data }` envelope; unwrap with `response.data.data`.

**UI / design system:**
- Theme defined in `src/theme/theme.js` — primary blue `#1C64AD`, secondary teal `#1D9E75`, background `#EEF4FB`, border-radius 12px globally.
- Liquid-glass aesthetic: components use `rgba` backgrounds + `backdropFilter: blur(16px)`. Reusable primitives are `GlassCard` and `AnimatedBackground` (used on the login screen).
- Inline MUI `sx` prop is the styling convention; no CSS modules or styled-components.
