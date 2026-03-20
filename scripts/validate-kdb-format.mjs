#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databasesDir = path.join(rootDir, 'databases');

/**
 * Executes a SQLite query with the system sqlite3 binary and returns trimmed text output.
 */
function runSqlite(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath, sql], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();
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
async function validateKdbFile(fileName) {
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

  const columnsRaw = runSqlite(dbPath, 'PRAGMA table_info(cards);');
  const columns = new Set(
    columnsRaw
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('|')[1])
  );

  for (const expectedColumn of ['id', 'term', 'summary', 'detail', 'category']) {
    assert(columns.has(expectedColumn), `${fileName}: cards.${expectedColumn} is missing`);
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
async function main() {
  const entries = await fs.readdir(databasesDir, { withFileTypes: true });
  const kdbFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.kdb'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  assert(kdbFiles.length > 0, 'No .kdb files found in databases/');

  const results = [];
  for (const fileName of kdbFiles) {
    results.push(await validateKdbFile(fileName));
  }

  console.log(`Validated ${results.length} .kdb files successfully.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
