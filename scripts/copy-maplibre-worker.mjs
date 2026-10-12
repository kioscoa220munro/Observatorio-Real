import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve('maplibre-gl/package.json');
const sourceDir = join(dirname(packageJsonPath), 'dist');
const targetDir = join(process.cwd(), 'public', 'maplibre');

mkdirSync(targetDir, { recursive: true });

for (const filename of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  const source = join(sourceDir, filename);
  const target = join(targetDir, filename);
  copyFileSync(source, target);
  console.log(`Copied MapLibre worker asset: ${filename} -> ${target}`);
}
