import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const crmBuildDir = path.join(projectRoot, 'dist', 'crm-webresource')
const packagingRoot = path.join(projectRoot, 'dist', 'crm-package')
const outputFiles = {
  html: 'advanced-find.html',
  js: 'advanced-find.js',
  css: 'advanced-find.css',
}

async function ensureBuildOutput() {
  const requiredFiles = [
    path.join(crmBuildDir, 'index.html'),
    path.join(crmBuildDir, outputFiles.js),
    path.join(crmBuildDir, outputFiles.css),
  ]

  for (const filePath of requiredFiles) {
    try {
      await readFile(filePath)
    } catch (error) {
      throw new Error(
        `CRM build artifact missing: ${path.relative(projectRoot, filePath)}. Run the appropriate CRM build before packaging.`,
        { cause: error }
      )
    }
  }
}

async function preparePackagingDirectory() {
  await rm(packagingRoot, { recursive: true, force: true })
  await mkdir(packagingRoot, { recursive: true })
}

async function copyBuildArtifacts() {
  await writeHtmlWithMetadata()
  await copyStaticAsset(outputFiles.js)
  await copyStaticAsset(outputFiles.css)
}

async function writeHtmlWithMetadata() {
  const sourcePath = path.join(crmBuildDir, 'index.html')
  const destinationPath = path.join(packagingRoot, outputFiles.html)
  const htmlContent = await readFile(sourcePath, 'utf8')
  const banner = [
    '<!--',
    '  Dynamics 365 Web Resource',
    `  Packaged: ${new Date().toISOString()}`,
    `  Version: ${process.env.npm_package_version ?? '0.0.0'}`,
    '-->',
  ].join('\n')

  await writeFile(destinationPath, `${banner}\n${htmlContent}`, 'utf8')
}

async function copyStaticAsset(fileName) {
  const source = path.join(crmBuildDir, fileName)
  const destination = path.join(packagingRoot, fileName)
  await copyFile(source, destination)
}

async function run() {
  await ensureBuildOutput()
  await preparePackagingDirectory()
  await copyBuildArtifacts()

  console.log(
    '✅ Dynamics CRM web resource files available at:',
    path.relative(projectRoot, packagingRoot)
  )
}

run().catch((error) => {
  console.error('❌ Failed to package CRM web resource:', error)
  process.exitCode = 1
})
