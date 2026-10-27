# omeryigitler.com

Ömer Yiğitler's portfolio, project archive and private client operations dashboard.
Static HTML/CSS/JavaScript, React islands, Vercel serverless APIs, and Firebase Authentication, Firestore and Storage.

## Development

Use Node.js 22 and npm (minimum version in `package.json`).

```sh
git clone https://github.com/omeryigitler/omeryigitler.com.git
cd omeryigitler.com
npm ci
npm run build
npm run dev
```

`npm ci` installs the pricing-tool dependencies from their own lockfile too. The initial build generates admin JavaScript, React islands, CSS, the pricing app and social preview. Rebuild after editing `src/admin/`. Vite only serves the frontend; use `npx vercel dev` and an isolated backend for API integration work.

## Checks and build

```sh
npm run test          # Node behavioral tests
npm run typecheck     # Root React TypeScript checks
npm run check:syntax  # Server, browser and build JavaScript
npm run quality      # All checks, then the production build
```

The public output is `dist/`. Builds do not rewrite source HTML, APIs or tracker logic. Generated files are ignored by Git. The archive footer is synchronized with the homepage footer in the output; local JS/CSS URLs receive content-based cache versions there. GitHub Actions runs quality checks and a second build to verify reproducibility.

The pricing app is built, but its independent TypeScript project is not covered by the root `typecheck` command.

## Structure

| Folder | Contents |
| --- | --- |
| `src/pages/` | Homepage, projects, admin, gateway and legal HTML pages |
| `src/admin/` | Dashboard feature code and build manifest |
| `src/react/`, `src/input.css` | React islands and Tailwind input |
| `public/assets/` | Browser scripts, CSS, images, globe textures and previews |
| `public/icons/` | Favicons, Apple touch icons and installable app icons |
| `public/` | Sitemap, robots.txt, manifest and domain marker |
| `api/`, `lib/` | Serverless endpoints and server-side helpers |
| `config/firebase/` | Firestore rules/indexes and storage CORS configuration |
| `config/pricing.json` | Server-side pricing rules |
| `templates/` | New-page template and reusable HTML snippets |
| `docs/guides/` | API, deployment and user guides |
| `docs/` | Dated audits and operational notes |
| `pricing-tool/`, `elitebody/` | Independent application packages |
| `scripts/`, `test/` | Build tools and regression tests |

Root files are limited to the README, agent instructions, package manifests and
configuration files used directly by development/deployment tools. Source pages
are assembled at their original root URLs; grouped icon files are also published
at their existing URLs. This organization does not change public links.

`npm run dev` builds first, then serves `dist/` through Vite. Rebuild and refresh
after editing HTML or admin sources. Use `bash scripts/create-page.sh page-name`
to create a page under `src/pages/` from `templates/page.html`.

Admin sources are concatenated in manifest order into one classic script, preserving shared state, function hoisting and existing inline handlers. This is a file organization change, not an authentication or workflow redesign.

## Configuration and releases

Vercel hosts the website and APIs. Firebase supplies data/auth, not website hosting. See [deployment guide](docs/guides/DEPLOYMENT.md) and [.env.example](.env.example). Use separate backend credentials for development and previews. Anonymous Firebase authentication does not grant admin rights; access is governed by the existing gateway and `config/firebase/firestore.rules`.

Work on a task branch and open a draft PR; see [AGENTS.md](AGENTS.md). The [API reference](docs/guides/API.md) and [user guide](docs/guides/USER_GUIDE.md) retain historical workflow detail; source and tests take precedence where they differ.

Private/proprietary application code; no open-source license grant is provided.
