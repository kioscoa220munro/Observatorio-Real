import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const sourceDir = join(process.cwd(), 'node_modules', 'maplibre-gl', 'dist');
const targetDir = join(process.cwd(), 'public', 'maplibre');

mkdirSync(targetDir, { recursive: true });

for (const filename of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  const source = join(sourceDir, filename);
  const target = join(targetDir, filename);
  copyFileSync(source, target);
  console.log(`Copied MapLibre worker asset: ${filename} -> ${target}`);
}
