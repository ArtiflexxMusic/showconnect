/**
 * Post-build fix: Next.js 15 bug with route groups
 * When app/page.tsx and app/(dashboard)/page.tsx both map to '/',
 * Next.js only generates the manifest for app/page.tsx.
 * Vercel's file tracer then can't find (dashboard)/page_client-reference-manifest.js.
 * This script creates a minimal valid manifest to fix the Vercel deployment.
 */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(
  process.cwd(),
  '.next/server/app/(dashboard)/page_client-reference-manifest.js'
);

if (!fs.existsSync(manifestPath)) {
  const dir = path.dirname(manifestPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const content = `self.__RSC_MANIFEST=(self.__RSC_MANIFEST||{});self.__RSC_MANIFEST["/app/(dashboard)/page"]={"ssrModuleMapping":{},"edgeSSRModuleMapping":{},"clientModules":{},"entryCSSFiles":{}};`;
  fs.writeFileSync(manifestPath, content);
  console.log('[fix-manifest] Created missing manifest:', manifestPath);
} else {
  console.log('[fix-manifest] Manifest already exists, skipping.');
}
