#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

function usageAndExit() {
  console.error('Usage: npm run unpack <published.zip>');
  process.exit(1);
}

if (process.argv.length !== 3) {
  usageAndExit();
}

const zipPath = process.argv[2];
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogDir = path.join(rootDir, 'catalog');
const databasesDir = path.join(rootDir, 'databases');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function extractZip(zipPath, destDirs) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const relPath = entry.entryName.replace(/^\/+/, '');
    if (relPath.startsWith('catalog/')) {
      const dest = path.join(catalogDir, relPath.slice('catalog/'.length));
      await ensureDir(path.dirname(dest));
      await fs.writeFile(dest, entry.getData());
      console.log(`Extracted: catalog/${relPath.slice('catalog/'.length)}`);
    } else if (relPath.startsWith('databases/')) {
      const dest = path.join(databasesDir, relPath.slice('databases/'.length));
      await ensureDir(path.dirname(dest));
      await fs.writeFile(dest, entry.getData());
      console.log(`Extracted: databases/${relPath.slice('databases/'.length)}`);
    }
  }
}

extractZip(zipPath, { catalogDir, databasesDir })
  .then(() => {
    console.log('Unpack complete.');
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
