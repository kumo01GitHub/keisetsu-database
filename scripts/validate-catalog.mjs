#!/usr/bin/env node
import { promises as fs, readdirSync, accessSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogDir = path.join(rootDir, 'catalog');
const decksDir = path.join(catalogDir, 'decks');
const catalogPath = path.join(catalogDir, 'catalog.json');


/**
 * Executes a SQLite query using node:sqlite and returns trimmed text output.
 */
function runSqlite(dbPath, sql) {
  const db = new Database(dbPath, { readonly: true });
  let result;
  if (/count\(\*\)/i.test(sql) || /limit 1/i.test(sql)) {
    const row = db.prepare(sql).get();
    result = Object.values(row).join('|');
  } else {
    const rows = db.prepare(sql).all();
    result = rows.map(r => Object.values(r).join('|')).join('\n');
  }
  db.close();
  return result;
}

/**
 * Throws when a validation condition is not met.
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Reads and parses a JSON file used by the catalog validation pipeline.
 */
function readJson(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Validates one catalog entry against its manifest file and backing `.kdb` database.
 */
function validateCatalogEntry(entry) {
  assert(typeof entry.id === 'string' && entry.id.trim().length > 0, 'catalog: entry.id is invalid');
  assert(
    typeof entry.manifest === 'string' && entry.manifest.trim().length > 0,
    `catalog: manifest path is invalid for id=${entry.id}`
  );

  const manifestPath = path.join(catalogDir, entry.manifest);
  accessSync(manifestPath);

  const deck = readJson(manifestPath);

  for (const key of ['id', 'title', 'path']) {
    assert(
      typeof deck[key] === 'string' && deck[key].trim().length > 0,
      `${entry.manifest}: missing or invalid ${key}`
    );
  }

  assert(deck.id === entry.id, `${entry.manifest}: id mismatch with catalog entry (${entry.id})`);
  assert(deck.path.endsWith('.kdb'), `${entry.manifest}: path must end with .kdb`);

  const dbPath = path.join(rootDir, deck.path);
  accessSync(dbPath);

  const metadataRow = runSqlite(
    dbPath,
    'SELECT display_name, file_name FROM deck_metadata ORDER BY id ASC LIMIT 1;'
  );
  assert(metadataRow.length > 0, `${entry.manifest}: deck_metadata row is missing`);

  const [displayName, fileName] = metadataRow.split('|');
  assert(displayName && displayName.trim().length > 0, `${entry.manifest}: deck_metadata.display_name is empty`);
  assert(fileName && fileName.trim().length > 0, `${entry.manifest}: deck_metadata.file_name is empty`);

  assert(
    displayName.trim() === deck.title.trim(),
    `${entry.manifest}: title mismatch (manifest='${deck.title}', db='${displayName}')`
  );

  const manifestFileName = path.basename(deck.path);
  assert(
    fileName.trim() === manifestFileName,
    `${entry.manifest}: file_name mismatch (manifest='${manifestFileName}', db='${fileName}')`
  );

  const cardCountRaw = runSqlite(dbPath, 'SELECT COUNT(*) FROM cards;');
  const cardCount = Number.parseInt(cardCountRaw, 10);
  assert(Number.isFinite(cardCount) && cardCount > 0, `${entry.manifest}: cards table is empty`);

  if (deck.cardCount != null) {
    assert(Number.isInteger(deck.cardCount), `${entry.manifest}: cardCount must be an integer`);
    assert(
      deck.cardCount === cardCount,
      `${entry.manifest}: cardCount mismatch (manifest=${deck.cardCount}, db=${cardCount})`
    );
  }

  return { id: deck.id, cardCount };
}

/**
 * Validates global catalog structure and every referenced deck artifact.
 */
function main() {
  const catalog = readJson(catalogPath);

  assert(typeof catalog.version === 'number', 'catalog.json: version must be a number');
  assert(typeof catalog.updatedAt === 'string', 'catalog.json: updatedAt must be a string');
  assert(Array.isArray(catalog.decks), 'catalog.json: decks must be an array');

  const seenIds = new Set();
  for (const entry of catalog.decks) {
    assert(!seenIds.has(entry.id), `catalog.json: duplicate deck id '${entry.id}'`);
    seenIds.add(entry.id);
  }

  const manifestEntries = readdirSync(decksDir, { withFileTypes: true });
  const manifestFileSet = new Set(
    manifestEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => `decks/${entry.name}`)
  );

  for (const entry of catalog.decks) {
    assert(manifestFileSet.has(entry.manifest), `catalog.json: manifest not found in decks/: ${entry.manifest}`);
  }

  const results = [];
  for (const entry of catalog.decks) {
    results.push(validateCatalogEntry(entry));
  }

  console.log(`Validated catalog consistency for ${results.length} decks successfully.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
