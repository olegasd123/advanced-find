## Dynamics 365 Web Resource Deployment

This project exposes an automated workflow for building and packaging the Advanced Find workspace as a Dynamics 365 web resource.

### 1. Build for CRM

Pick the build profile that matches your deployment needs:

- Minified bundle (recommended for production):

  ```bash
  npm run build:crm
  ```

- Readable bundle with sourcemaps (helpful for troubleshooting):

  ```bash
  npm run build:crm:dev
  ```

Both commands emit the CRM-ready assets to `dist/crm-webresource` with static filenames.

### 2. Package web-resource assets

Produce the deployable files directly (no ZIP archive is created):

- Minified package:

  ```bash
  npm run package:webresource
  ```

- Unminified package:

  ```bash
  npm run package:webresource:dev
  ```

Each command ensures the relevant build has been run and then writes the following files to `dist/crm-package`:

- `advanced-find.html` (with an embedded metadata banner)
- `advanced-find.js`
- `advanced-find.css`
