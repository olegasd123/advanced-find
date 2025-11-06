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

### CRM Configuration

The workspace reads its runtime settings from the `mso_variabledenvironnement` table. Ensure a row exists with `mso_name = 'AdvancedFindSettings'`; the `mso_codelibelle` column must contain the JSON payload described in `todo.md`. Missing or malformed data will fall back to the default build-time configuration.

### 3. Upload to Dynamics 365

1. Open **Power Apps** → **Solutions** (or navigate directly within Dynamics 365).
2. Choose your target solution (or create a new solution dedicated to web resources).
3. Upload the three files as web resources under the same logical folder (for example, prefix each name with `advanced-find/` when prompted).
4. Set `advanced-find/advanced-find.html` as the primary entry point web resource and publish all customizations.

### Additional Notes

- The generated HTML uses relative paths (`./advanced-find.js` and `./advanced-find.css`), so placing the three files in the same folder within CRM preserves their linkage.
- Re-run the relevant `package:webresource*` command after any code changes to refresh the deployable files.
- The packaging script now embeds the current npm package version inside the HTML banner for traceability.
