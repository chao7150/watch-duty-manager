# watch-duty-manager

アニメ作品の視聴管理を行うWebアプリケーション。Animetick の自分用アレンジ。

## できること

- アニメ作品（Work）の登録・編集・一括作成
- 作品の視聴登録（Subscribe）/解除（Unsubscribe）
- 視聴遅延（watchDelaySecFromPublish）や視聴用URL（watchUrl）の設定
- エピソード（Episode）の追加・削除
- エピソードごとの視聴完了（watched）/スキップ（skipped）登録・解除
- コメント投稿・評価（rating）記録
- 知識グラフ（KnowledgeNode / KnowledgeEdge）による作品・エピソード・制作者・概念間の自由な関係付け
- ダッシュボード・マイページでの視聴状況・週次/クール別メトリクス可視化

---

# ディレクトリ構成

- `app/` ... アプリケーション本体（React Router 7 ベース）
  - `adapters/repository/` ... Prisma 実装のリポジトリ群（`prisma/` 以下に work/episode/watch/knowledge/metrics 等）
  - `components/` ... UIコンポーネント群（`work/`, `Episode/`, `watch-settings-edit-form/`, `work-create-form/`, `work-edit-form/`, `hooks/`, `Icons/` 等）
  - `domain/` ... ドメイン層（ビジネスロジック・型定義・リポジトリインターフェース）
    - `cour/` ... クール（四半期）の定義と日付変換
    - `date/` ... 深夜アニメ基準（4時起点）の日付ユーティリティ
    - `episode/` ... エピソードの型・ステータス（published/onair/today/tomorrow）
    - `knowledge/` ... 知識グラフのノード・エッジ型とリポジトリIF
    - `metrics/` ... 週次メトリクスの集計ロジック
    - `ticket/` ... 視聴チケット（視聴遅延を考慮した視聴可能エピソード抽出）
    - `watch/` ... 視聴登録・視聴実績の型とリポジトリIF
    - `work/` ... 作品の型・統計計算（rating/completeCount 等）とリポジトリIF
  - `routes/` ... React Router のフラットルーティング（`@react-router/fs-routes`）
    - `_index.tsx` ... ダッシュボード
    - `my.tsx` / `my._index.tsx` ... マイページ
    - `works._index.tsx`, `works.$workId/`, `works.$workId.$count.tsx`, `create.tsx` ... 作品関連
    - `knowledge._index.tsx`, `knowledge.$nodeId.tsx` ... 知識グラフ
    - `login.tsx`, `logout.tsx`, `status.ts`
  - `styles/` ... グローバルCSS（Tailwind v4）
  - `usecases/` ... ユースケース層（各機能のアプリケーションサービス）
    - `_shared/` ... 複数ユースケース間共有のDTO・共通定義（他ユースケースに依存禁止）
  - `utils/` ... 基盤ユーティリティ（`db.server.ts`, `firebase.server.ts`, `session.server.ts`, `result.ts`, `validator.ts`, `type.ts`, `date.ts`）
  - `test/` ... テスト用ファクトリ・インテグレーションセットアップ
- `prisma/` ... Prisma スキーマ・マイグレーション・seed
- `container/` ... Docker Compose（`compose.local.yml`）・MySQL 設定
- `docs/` ... 設計文書（知識グラフ設計等）
- `example/` ... サンプルデータ（CSV）
- `build/` ... ビルド成果物
- `logs/` ... ログ・SQLダンプ

> 注: `infra/`, `public/`, `scripts/` ディレクトリは現存しません。

---

# 使用技術

- フロントエンド: React 19, React Router 7, TypeScript, Tailwind CSS v4, Recharts, react-multi-date-picker
- バックエンド: Node.js (>=24), Prisma ORM 6, MySQL 8
- 認証: Firebase Authentication（`firebase` + `firebase-admin`）+ Cookie Session
- 日付処理: Temporal API（`temporal-polyfill`）。date-fns は非推奨
- テスト: Vitest 4
- リント/フォーマット: Biome 2
- 依存関係検査: dependency-cruiser
- ビルド: Vite 8（`@react-router/dev/vite` の `reactRouter()` プラグイン）
- その他: ESLint/Prettier は使用せず Biome に統一、simple-git-hooks（pre-commit で `biome check --staged --write`）

---

# アプリケーションの主要な概念

## 1. アニメ作品（Work）
- アニメのタイトル・公開日・話数（durationMin）・公式サイト・Twitter・ハッシュタグを管理
- 1つの作品は `knowledgeNodeId` を持ち、知識グラフのノードとしても扱われる
- 複数のエピソード（Episode）を持つ

## 2. エピソード（Episode）
- 各作品に紐づく単話情報（`workId` + `count` の複合ユニーク）
- `knowledgeNodeId` を持ち、知識グラフのノードとしても扱われる
- 公開日・タイトル・説明を管理

## 3. ユーザー（User）
- Firebase 認証で管理されるアカウント。Prisma 上は `userId`（文字列）で識別
- セッションは Cookie（`__session`）に保存、`SECRET` 環境変数必須

## 4. 視聴登録（SubscribedWorksOnUser）
- ユーザーがどの作品を視聴登録しているか（`userId` + `workId` 複合主キー）
- 視聴遅延（`watchDelaySecFromPublish`）・視聴用URL（`watchUrl`）を保持

## 5. エピソード視聴状態（EpisodeStatusOnUser）
- ユーザーごとのエピソード視聴状態（`userId` + `workId` + `count` 複合主キー）
- `status`: `"watched"` | `"skipped"`
- `createdAt`・`comment`・`rating`（rating は watched のみ有効）を記録
- 旧称 `WatchedEpisodesOnUser` から改名（skip 対応のため）

## 6. 知識グラフ（KnowledgeNode / KnowledgeEdge）
- Work・Episode・自由な概念をノードとして統一的に扱う
- `KnowledgeNode`: `name`・`content` を持ち、Work/Episode と 1:1 で関連
- `KnowledgeEdge`: `fromId`→`toId` の有向エッジ、`edgeType`（例: 監督・所属会社・特徴・is_a 等）
- Work/Episode は `knowledgeNodeId` を経由してグラフに参加
- 詳細は `docs/knowledge-graph-design.md` を参照

## 関連
- 1つの作品（Work）は複数のエピソード（Episode）を持つ
- 1人のユーザーは複数の作品を視聴登録できる
- 1人のユーザーは複数のエピソードの視聴状態を記録できる
- Work/Episode/KnowledgeNode は KnowledgeEdge で自由に結ばれる

---

# アーキテクチャ

## レイヤー構成
- `routes/`（プレゼンテーション）→ `usecases/`（アプリケーションサービス）→ `domain/`（ビジネスロジック + リポジトリIF）→ `adapters/repository/`（Prisma 実装）
- ドメイン層はリポジトリの **インターフェース** のみ定義し、Prisma 実装は `adapters/repository/prisma/` に配置
- `usecases/_shared/` は他ユースケースから依存されてよいが、自身は他ユースケースに依存してはならない（dependency-cruiser で強制）

## Result 型
- ドメイン操作の失敗は `~/utils/result` の `Result<T, AppError>` で表現
- `AppError` の種類: `not_found` / `validation` / `unique_constraint` / `unauthorized` / `forbidden` / `db` / `internal`
- `errorToStatus` で HTTP ステータスに変換

## 日付処理
- Temporal API（`temporal-polyfill`）を使用。date-fns は非推奨
- 深夜アニメ基準: 4時起点で日付を計算（`get4OriginDateFromTemporal` / `getAnimeDate`）
- クール判定も4時基準（`date2cour` / `zonedDateTime2cour`）

---

# 開発手順

## 開発上必要な操作（package.json の scripts）
- 型チェック: `npm run test:tsc`（`react-router typegen && tsc --noEmit --incremental`）
- テスト: `npm run test`（`SECRET=test-secret vitest run`）
- インテグレーションテスト: `npm run test:integration`（`.env.test` を読み込み prisma db push 後に vitest run）
- リント/フォーマット: `npm run check`（`biome check --write ./app && depcruise app`）
- 開発サーバー: `npm run dev`（`react-router dev --host 0.0.0.0`、dotenv で `.env` 読み込み）
- ビルド: `npm run build`（`react-router build`）
- 本番起動: `npm run start`（`react-router-serve ./build/server/index.js`）
- DB セットアップ: `npm run db:setup`（`prisma db push && prisma db seed`）

## 開発の基本ルール
- 変更を加えた後は **型チェック（`npm run test:tsc`）とテスト（`npm run test`）を行うこと**
- 変更を行う前に、必ずテストの存在を確認し、テストが既存のコードで動作することを確認すること
- タスク終了時には、自らの判断がユーザーによって訂正された箇所を振り返り、修正点をこのファイル（AGENTS.md）に追記せよ
- 不要な import 文は削除する
- フォームの `label` と `input` の関連付けでは、`id` 重複のリスクを避けるため、可能な限り `label` のネスト構造を優先し、`htmlFor`+`id` は必要時のみ使う

## Manual Setup（devcontainer 以外で開発する場合）
```bash
npm i
sudo nerdctl compose -f container/compose.local.yml up -d db
npx prisma generate
npm run db:setup  # 初回のみ
npm run dev
```

## Prisma マイグレーション
- `prisma/schema.prisma` を変更したときは `npx prisma migrate dev --name <name>` を実行する
- **既存テーブルに必須カラム（特にFK列）を追加する場合は、データ移行を1マイグレーション内に手書きで含めること**。`migrate dev` はDDLしか自動生成しないため、空テーブルでは通っても既存データのある本番では失敗する（`P3009`）。手順は **(1) NULL許容で列追加 → (2) 既存行をbackfill → (3) NOT NULL化＋FK追加** を同一マイグレーションSQLにまとめる
  - 実例: `knowledgeNodeId` を Work/Episode に後付けした際、backfill を欠いたため本番（既存データあり）で `MODIFY ... NOT NULL` が失敗した。Work/Episode ごとに空の `KnowledgeNode` を 1:1 で作って紐付ける backfill が必要だった
- **既に適用済みのマイグレーションファイルは編集しない**。`_prisma_migrations` の checksum と不整合になり、`migrate deploy`/`migrate status` がエラーになる。修正が必要なら新しいマイグレーションを追加する
- 本番で `P3009`（失敗マイグレーションが残存）になった場合は、DBを手動で目的状態まで修復してから `npx prisma migrate resolve --applied <migration_name>` で適用済みに記録する。作業前に必ず `mysqldump` でバックアップを取得すること

---

# Lint / フォーマット運用メモ

- Biome lint/style/useButtonType: フォーム外で使う button でも明示的に `type="button"` を付ける。省略すると lint 違反になる
- pre-commit フック: `npx biome check --staged --write --no-errors-on-unmatched`

---

# ビルド運用メモ

- Tailwind CSS v4 の自動ソース検出は `.gitignore` を参照するため、Docker build でも `.gitignore` を context に含めて builder へコピーしないと `build/client` を拾って server/client で CSS ハッシュが分岐し、hydration mismatch になることがある
