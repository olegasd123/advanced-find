import path from 'node:path'
import fs from 'node:fs'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, searchForWorkspaceRoot } from 'vite';

export default defineConfig(({ mode }) => {
  const isCrmBuild = mode === 'crm' || mode === 'crm-dev';
  const isCrmDevBuild = mode === 'crm-dev';

  return {
    plugins: [react(), tailwindcss(),
      {
        name: 'run-script',
        enforce: 'pre',
        writeBundle: () => isCrmBuild ? fs.copyFile(
          `${__dirname}/assets/app-config.json`,
          `${__dirname}/dist/crm-webresource/app-config.json`,
          (error: any) => error ?? console.error(error)
        ) : undefined
      }
    ],
    base: isCrmBuild ? './' : '/',
    build: isCrmBuild
      ? {
          outDir: 'dist/crm-webresource',
          assetsDir: '',
          emptyOutDir: true,
          sourcemap: isCrmDevBuild,
          minify: !isCrmDevBuild,
          rollupOptions: {
            output: {
              entryFileNames: 'advanced-find.js',
              chunkFileNames: 'advanced-find.js',
              inlineDynamicImports: true,
              manualChunks: undefined,
              assetFileNames: (assetInfo) => {
                const ext = path.extname(assetInfo.name ?? '').slice(1);
                if (ext === 'css') {
                  return 'advanced-find.css';
                }
                return '[name][extname]';
              },
            },
          },
        }
      : undefined,
    server: {
      host: '0.0.0.0',
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd()), 'assets', 'mock-data']
      }
    }
  };
});
