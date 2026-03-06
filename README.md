# Advanced Find

A modern advanced search interface for Microsoft Dynamics 365. Provides a configurable filter builder with grouped AND/OR conditions, sortable result tables, and FetchXML query generation — all driven by a single JSON configuration file.

## Features

- **Filter Builder** — drag-and-drop filter reordering, grouped AND/OR conditions, category-based organization, support for lookups, picklists, dates, and null checks
- **Results Table** — sortable, resizable, and toggleable columns with pagination; supports columns from related entities via relation paths
- **Configuration-Driven** — a single `app-config.json` defines searchable entities, filter options, result columns, and default sorts with no code changes required
- **CRM Integration** — FetchXML generation, OData metadata retrieval, two-pass search for complex OR conditions, and result deduplication

## Tech Stack

- React 19, TypeScript, Tailwind CSS 4, Vite 6
- Catalyst UI kit, Headless UI, Heroicons, Framer Motion
- Deployed as a Dynamics 365 Web Resource

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm

### Install & Run

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` by default.

### Environment Variables

Set runtime values in `.env`:

| Variable                            | Default | Description                                                                 |
| ----------------------------------- | ------- | --------------------------------------------------------------------------- |
| `VITE_CRM_API_VERSION`              | `v9.2`  | CRM Web API version used for metadata and data requests.                    |
| `VITE_SEARCH_RESULT_IDS_CHUNK_SIZE` | `120`   | Number of IDs per final FetchXML `in` query in two-pass search.             |
| `VITE_FILTER_DRAG_THRESHOLD_PX`     | `6`     | Pointer movement (in px) required before drag-and-drop starts in filter UI. |

### Available Scripts

| Script                        | Description                           |
| ----------------------------- | ------------------------------------- |
| `npm run dev`                 | Start Vite dev server                 |
| `npm run build`               | Type-check and build for web          |
| `npm run build:crm`           | Minified build for Dynamics 365       |
| `npm run build:crm:dev`       | CRM build with sourcemaps             |
| `npm run package:webresource` | Build and package for CRM deployment  |
| `npm run preview`             | Preview production build on port 8989 |
| `npm run lint`                | Run ESLint                            |
| `npm run format`              | Format with Prettier                  |
| `npm test`                    | Run unit tests                        |

## Configuration

All search behavior is defined in `assets/app-config.json`. The config specifies:

- **Entities** — which CRM entities are searchable
- **Filter Options** — available filters with defaults, lookups, and picklist support
- **Filter Categories** — logical grouping of filters in the UI
- **Result View** — columns, pagination, and default sort order
- **Relation Paths** — multi-entity traversal for filters and columns on related records
- **Localization** — custom labels for filter conditions

See [docs/app-config-manual.md](docs/app-config-manual.md) for the full configuration reference.

Developer and AI coding rules:

- [docs/dev-rules.md](docs/dev-rules.md)
- [docs/ai-model-rules.md](docs/ai-model-rules.md)

## Deployment

The project packages as a Dynamics 365 Web Resource. See [docs/deployment.md](docs/deployment.md) for step-by-step instructions.

## Project Structure

```
src/
├── app/crm/          # Main search UI (filter grid, result grid)
├── components/       # Reusable control wrappers
├── hooks/            # App config, pagination, sorting, column resize/visibility
├── libs/types/       # Shared model types (app config + domain)
├── libs/data/crm/    # Dynamics 365 API integration
└── libs/utils/crm/   # Search logic, FetchXML, filters, relation paths
assets/               # app-config.json
docs/                 # Configuration manual, deployment guide, dev + AI rules
scripts/              # Web resource packaging
```
