import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react(), tailwindcss(),
      {
        name: 'run-script',
        enforce: 'pre',
        writeBundle: () => fs.copyFile(
          `${__dirname}/assets/app.config.json`,
          `${__dirname}/dist/WebResources/${env.VITE_CRM_SOLUTION_PREFIX}/advanced-find/app.config.json`,
          (error: any) => error ?? console.error(error)
        )
      }
    ],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `WebResources/${env.VITE_CRM_SOLUTION_PREFIX}/advanced-find/[name].js`,
          chunkFileNames: `WebResources/${env.VITE_CRM_SOLUTION_PREFIX}/advanced-find/[name].js`,
          assetFileNames: `WebResources/${env.VITE_CRM_SOLUTION_PREFIX}/advanced-find/[name].[ext]`
        }
      }
    },
    server: {
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd()), 'assets/app.config.json']
      }
    }
  }
})
