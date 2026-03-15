#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogDir = path.join(rootDir, 'catalog');
const decksDir = path.join(catalogDir, 'decks');
const catalogPath = path.join(catalogDir, 'catalog.json');

function toIsoDate(date) {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
}

async function readDeckManifest(fileName) {
  const filePath = path.join(decksDir, fileName);
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw);

  if (!data.id || typeof data.id !== 'string') {
    throw new Error(`Deck manifest is missing id: ${fileName}`);
  }

  return {
    id: data.id,
    manifest: `decks/${fileName}`,
  };
}

async function main() {
  const deckEntries = await fs.readdir(decksDir, { withFileTypes: true });
  const deckFiles = deckEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const decks = [];
  for (const fileName of deckFiles) {
    decks.push(await readDeckManifest(fileName));
  }

  let previousVersion = 2;

  try {
    const previousCatalogRaw = await fs.readFile(catalogPath, 'utf8');
    const previousCatalog = JSON.parse(previousCatalogRaw);
    if (typeof previousCatalog.version === 'number') {
      previousVersion = previousCatalog.version;
    }
  } catch {
    // First run can create a new catalog from scratch.
  }

  const nextCatalog = {
    version: previousVersion,
    updatedAt: toIsoDate(new Date().toISOString()),
    decks,
  };

  await fs.writeFile(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`, 'utf8');
  console.log(`Updated catalog with ${decks.length} decks: ${path.relative(rootDir, catalogPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
