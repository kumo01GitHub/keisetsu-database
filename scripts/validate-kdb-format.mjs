#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databasesDir = path.join(rootDir, 'databases');

// Read expected schema from SQL files
function parseColumnsFromSql(sql) {
  // Extract column names from CREATE TABLE ... (...)
  const match = sql.match(/CREATE TABLE IF NOT EXISTS \w+ \(([^;]+)\)/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('--'))
    .map(line => line.split(/\s+/)[0])
    .filter(name => !['PRIMARY', 'UNIQUE', 'CHECK', 'INDEX', 'KEY', ');'].includes(name.toUpperCase()));
}

const cardsSql = readFileSync(path.join(rootDir, 'schema/cards.sql'), 'utf8');
const deckMetadataSql = readFileSync(path.join(rootDir, 'schema/deck_metadata.sql'), 'utf8');
const expectedCardsColumns = parseColumnsFromSql(cardsSql);
const expectedDeckMetadataColumns = parseColumnsFromSql(deckMetadataSql);

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
 * Validates that one `.kdb` file satisfies the shared deck schema contract.
 */
function validateKdbFile(fileName) {
  const dbPath = path.join(databasesDir, fileName);

  const cardsTableExists = runSqlite(
    dbPath,
    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'cards';"
  );
  assert(cardsTableExists === '1', `${fileName}: cards table is missing`);

  const metadataTableExists = runSqlite(
    dbPath,
    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'deck_metadata';"
  );
  assert(metadataTableExists === '1', `${fileName}: deck_metadata table is missing`);

  // Validate cards columns from schema/cards.sql
  const cardsColumnsRaw = runSqlite(dbPath, 'PRAGMA table_info(cards);');
  const cardsColumns = new Set(
    cardsColumnsRaw
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('|')[1])
  );
  for (const expectedColumn of expectedCardsColumns) {
    assert(cardsColumns.has(expectedColumn), `${fileName}: cards.${expectedColumn} is missing`);
  }

  // Validate deck_metadata columns from schema/deck_metadata.sql
  const metadataColumnsRaw = runSqlite(dbPath, 'PRAGMA table_info(deck_metadata);');
  const metadataColumns = new Set(
    metadataColumnsRaw
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('|')[1])
  );
  for (const expectedColumn of expectedDeckMetadataColumns) {
    assert(metadataColumns.has(expectedColumn), `${fileName}: deck_metadata.${expectedColumn} is missing`);
  }

  const metadataRow = runSqlite(
    dbPath,
    'SELECT display_name, file_name FROM deck_metadata ORDER BY id ASC LIMIT 1;'
  );
  assert(metadataRow.length > 0, `${fileName}: deck_metadata row is missing`);

  const [displayName, registeredFileName] = metadataRow.split('|');
  assert(displayName && displayName.trim().length > 0, `${fileName}: deck_metadata.display_name is empty`);
  assert(
    registeredFileName && registeredFileName.trim().length > 0,
    `${fileName}: deck_metadata.file_name is empty`
  );
  assert(
    registeredFileName.endsWith('.kdb'),
    `${fileName}: deck_metadata.file_name must end with .kdb`
  );

  const cardCountRaw = runSqlite(dbPath, 'SELECT COUNT(*) FROM cards;');
  const cardCount = Number.parseInt(cardCountRaw, 10);
  assert(Number.isFinite(cardCount) && cardCount > 0, `${fileName}: cards table is empty`);

  return { fileName, cardCount };
}

/**
 * Validates every database file in `databases/`.
 */
function main() {
  const entries = readdirSync(databasesDir, { withFileTypes: true });
  const kdbFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.kdb'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  assert(kdbFiles.length > 0, 'No .kdb files found in databases/');

  const results = [];
  for (const fileName of kdbFiles) {
    results.push(validateKdbFile(fileName));
  }

  console.log(`Validated ${results.length} .kdb files successfully.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}


