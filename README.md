# keisetsu Database

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/kumo01GitHub/keisetsu-database/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://github.com/kumo01GitHub/keisetsu-database/actions/workflows/ci.yml/badge.svg)](https://github.com/kumo01GitHub/keisetsu-database/actions/workflows/ci.yml)

keisetsu で配布する `.kdb`（SQLite）を管理するリポジトリです。  
このリポジトリは「データ本体」と「配布メタデータ」と「検証自動化」を同時に管理します。

## ディレクトリ構成

```
keisetsu-database/
├── catalog/
│   ├── catalog.json         # 全deckの索引（自動生成）
│   └── decks/              # 各deckのmanifest（JSON）
├── databases/              # 各deckの.kdb（SQLite DB）
├── schema/                 # テーブルごとに分割したSQLスキーマ
│   ├── deck_metadata.sql   # deck_metadataテーブル定義
│   └── cards.sql           # cardsテーブル定義
├── scripts/                # 各種自動化スクリプト
├── package.json            # npm scripts定義
└── README.md
```

### 各ディレクトリの役割

- `catalog/` … 配布用メタデータ（索引・manifest）
- `databases/` … モバイルアプリが読み込む.kdb本体
- `schema/` … テーブルごとに分割したSQLスキーマ
- `schema.sql` … kdbの標準スキーマ（全体/一括用）
- `scripts/` … 自動化・検証用スクリプト

## kdb の説明

`.kdb` は SQLite ファイルです。  
モバイル側では以下を前提に読み込みます。

### 必須テーブル

- `deck_metadata`
	- 単語帳メタ情報（表示名、ファイル名）
	- `id = 1` の単一行運用
- `cards`
	- 学習カード本体

## 提供コマンド

| コマンド | 概要 |
|---------|-----|
| npm run unpack -- /path/to/published.zip | keisetsu-publisherのzipをcatalog/databasesに展開 |
| npm run build | catalog/decks/*.jsonからcatalog/catalog.jsonを再生成 |
| npm run validate:kdb | .kdbファイルの必須テーブル/列/件数を検証 |
| npm run validate:catalog | catalog.jsonとmanifest/.kdbの整合性を検証 |
| npm run validate | validate:kdbとvalidate:catalogをまとめて実行 |

## kdb 更新手順

### 前提

- Node.js
- npm

### 手順

1. `git clone` またはリポジトリを取得し、`cd keisetsu-database`
2. `npm ci` で依存をインストール
3. `keisetsu-publisher` で `.kdb`/manifest入りzipを出力
4. `npm run unpack -- /path/to/published.zip` で展開（catalog/databasesに上書き）
5. `npm run build` で catalog.json を再生成
6. `npm run validate` で形式・整合性を検証
7. 問題なければ commit/push（必要に応じてtag）

## 配布URLの基本形

```text
https://raw.githubusercontent.com/{owner}/{repo}/{ref}/catalog/catalog.json
https://raw.githubusercontent.com/{owner}/{repo}/{ref}/catalog/decks/{deck-id}.json
manifest の path を使って .kdb を取得
例: https://raw.githubusercontent.com/{owner}/{repo}/{ref}/databases/starter-basic.kdb
```

## 関連リンク

- [keisetsu-mobile](https://github.com/kumo01GitHub/keisetsu-mobile)
- [keisetsu-publisher](https://github.com/kumo01GitHub/keisetsu-publisher)
- [keisetsu-docs](https://github.com/kumo01GitHub/keisetsu-docs)
