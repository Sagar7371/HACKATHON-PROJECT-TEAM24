# SkillSwap

SkillSwap is a full-stack MERN-style skill exchange platform. Members can offer what they know, find people who want to learn it, save interesting skills, message exchange partners, and manage their profile.

## Highlights

- Responsive React + Vite interface with light/dark mode persisted in `localStorage`
- Skill search, category filtering, relevance/rating/newest sorting, bookmarks, loading skeletons, empty/error states, and toast feedback
- Profile creation with bcrypt password hashing, login/logout, editable profile data, and circular profile picture upload
- Account dropdown with profile, messages, exchanges, saved skills, settings, and logout
- Direct message API with local JSON persistence and MongoDB-ready models
- Accessible labels, keyboard-friendly buttons, focusable controls, alt text, and responsive mobile navigation
- Vitest + React Testing Library smoke tests

## Run locally

Prerequisites: Node.js 18+ and optionally MongoDB.

```powershell
cd E:\Coding\SkillSwap
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:5000`.

To use MongoDB, copy `server/.env.example` to `server/.env` and set `MONGODB_URI`. Without MongoDB, profiles and messages persist locally in `server/data/` for development.

## Quality checks

```powershell
npm run build --prefix client
npm test --prefix client
```

## Deployment

The client can be deployed to Vercel, Netlify, or Cloudflare Pages with `npm run build --prefix client` and output directory `client/dist`. Deploy the Express server to Render, Railway, or Fly.io, set `CLIENT_URL`, `MONGODB_URI`, and `PORT`, then set the client `VITE_API_URL` to the deployed API URL.

A live deployment URL is intentionally not included because this workspace has no hosting credentials or deployment target configured.

## Project layout

- `client/` React/Vite frontend
- `server/` Express API, MongoDB models, and local development persistence
- `server/src/data/seedSkills.js` exchange board seed catalog
- `server/data/` local profile and message records
