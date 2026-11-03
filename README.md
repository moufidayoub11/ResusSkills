# ResusSkills

Gamified medical quiz platform for training and assessing healthcare professionals on shock management (hemorrhagic, septic, anaphylactic, cardiogenic). The interface is in French.

Students take a pre-test, work through four clinical-case phases, then a post-test. A research workspace for professors shows results, analytics and exports.

## Features

- **Quiz:** MCQ and clinical-case questions, per-phase review, combos and achievements.
- **Accounts:** email/password and Google sign-in (Auth.js), with `student` and `professor` roles.
- **Professor workspace (`/dashboard`):** accounts, attempts and answers with audited edits, data-quality checks, analytics, and pseudonymous dataset and figure exports.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, MongoDB (Mongoose and the native driver), Auth.js v5, ECharts, Vitest.

## Getting started

Requires Node.js 20+ and a MongoDB database.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000. Google sign-in setup is described in [docs/google-auth.md](docs/google-auth.md).

Professor access is granted by setting `role: "professor"` on a user document in the `users` collection.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Run the Vitest suite (uses an in-memory MongoDB replica set) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `node scripts/professor-test-server.mjs` | Run the app on port 3001 against a disposable database and a throwaway professor account |
| `MONGODB_URI=... node scripts/backup-database.mjs <dir>` | Write a compressed snapshot of the database |
| `npm run question-bank:restructure` | Regroup `data/question-bank.json` by shock type |

Professor query indexes (`lib/professor/indexes.ts`) are not applied automatically; run `applyProfessorIndexes` once per deployment.

## Documentation

- [docs/design.md](docs/design.md): design and scientific-export rules for the professor workspace
- [docs/google-auth.md](docs/google-auth.md): Google OAuth setup
- [docs/third-party-ui.md](docs/third-party-ui.md): third-party component credits

## License

[MIT](LICENSE). Vendored components keep their own licenses.
