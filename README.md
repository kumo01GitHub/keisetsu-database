# keisetsu Database

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/kumo01GitHub/keisetsu/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://github.com/kumo01GitHub/keisetsu-database/actions/workflows/ci.yml/badge.svg)](https://github.com/kumo01GitHub/keisetsu-database/actions/workflows/ci.yml)

keisetsu で配布する `.kdb`（SQLite）を管理するリポジトリです。  
このリポジトリは「データ本体」と「配布メタデータ」と「検証自動化」を同時に管理します。

## ここで管理するもの

- `databases/*.kdb`
	- 実際にモバイルアプリが読み込む単語帳データ
- `catalog/decks/*.json`
	- deck ごとの manifest（タイトル、パス、件数など）
- `catalog/catalog.json`
	- 各 manifest への参照をまとめた索引（一覧）
- `schema.sql`
	- kdb の標準スキーマ契約
- `scripts/*.mjs`
	- catalog 再生成と検証

## kdb の説明

`.kdb` は SQLite ファイルです。  
モバイル側では以下を前提に読み込みます。

### 必須テーブル

- `deck_metadata`
	- 単語帳メタ情報（表示名、ファイル名）
	- `id = 1` の単一行運用
- `cards`
	- 学習カード本体

### 標準スキーマ（`schema.sql`）

```sql
CREATE TABLE IF NOT EXISTS deck_metadata (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	display_name TEXT NOT NULL,
	file_name TEXT NOT NULL,
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
	id TEXT PRIMARY KEY,
	term TEXT NOT NULL,
	summary TEXT NOT NULL,
	detail TEXT DEFAULT '',
	category TEXT DEFAULT '',
	created_at TEXT DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## スクリプトの説明

- `scripts/update-catalog.mjs`
	- `catalog/decks/*.json` を走査し `catalog/catalog.json` を再生成
	- catalog には各 deck の `id` と manifest パスを記録
	- catalog の `updatedAt` を更新

- `scripts/validate-kdb-format.mjs`
	- すべての `.kdb` に対して必須テーブル/列を検証
	- `deck_metadata.display_name`, `file_name`, カード件数を検証

- `scripts/validate-catalog.mjs`
	- `catalog/catalog.json` と `catalog/decks/*.json` の整合性を検証
	- manifest と `.kdb` のタイトル/ファイル名/件数を突合

## kdb 更新手順

1. `keisetsu-admin` などで `.kdb` と deck manifest を生成する
2. `.kdb` を `databases/` に配置する
3. deck manifest を `catalog/decks/` に配置または更新する
4. `npm run build` で `catalog/catalog.json` を再生成する
5. `npm run validate` で形式・整合性を検証する
6. 問題がなければ commit / push（必要に応じて tag）する

## ローカル開発・検証

### 前提

- Node.js 20 系以上（推奨）
- npm
- `sqlite3` CLI（検証スクリプトで使用）

### コマンド

```bash
cd keisetsu-database
npm ci

# catalog を再生成
npm run build

# 形式検証
npm run validate:kdb

# catalog と DB の整合性検証
npm run validate:catalog

# まとめて検証
npm run validate
```

## 配布URLの基本形

```text
https://raw.githubusercontent.com/{owner}/{repo}/{ref}/catalog/catalog.json
https://raw.githubusercontent.com/{owner}/{repo}/{ref}/catalog/decks/{deck-id}.json
manifest の path を使って .kdb を取得
例: https://raw.githubusercontent.com/{owner}/{repo}/{ref}/databases/starter-basic.kdb
```

## 関連リンク

- [keisetsu-mobile](https://github.com/kumo01GitHub/keisetsu-mobile)
- [keisetsu-admin](https://github.com/kumo01GitHub/keisetsu-admin)
- [keisetsu-docs](https://github.com/kumo01GitHub/keisetsu-docs)
