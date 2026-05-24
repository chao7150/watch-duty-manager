# Step 4 動作確認シナリオ

## 概要

Step 4 (`create.tsx` の TE.bind チェーンを Use Case + 早期returnに書き換え) に関連する変更の動作確認シナリオです。

### 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/usecases/createWork.ts` | 新規: 単一作品登録Use Case |
| `app/usecases/bulkCreateWorks.ts` | 新規: 一括作品登録Use Case |
| `app/routes/create.tsx` | fp-ts除去 → Result型 + Use Case呼び出しに全面書き換え |
| `app/components/WorkBulkCreateForm.tsx` | `serverValidator` を fp-ts Either から Result型(Ok/Err)に変換 |
| `app/domain/work/types.ts` | `BulkWorkInput` 型追加 |
| `app/domain/work/repository.ts` | `findManyByTitle` 戻り値を `Result<WorkTitleRecord[], AppError>` に変更 |
| `app/adapters/repository/prisma/work.ts` | P2002一意制約エラー検出追加、`findManyByTitle` エラーハンドリング追加 |

---

## 1. 静的確認 (ビルド・型・Lint・テスト)

### 1-1. TypeScript型チェック

```bash
npm run test:tsc
```

**期待結果**: エラーなしで完了すること

### 1-2. Lintチェック (Biome)

```bash
npm run check
```

**期待結果**: `No fixes applied` で完了すること

### 1-3. 既存ユニットテスト

```bash
npm test
```

**期待結果**: 全テストがパスすること (7 files, 62 tests)

### 1-4. fp-ts依存の除去確認

```bash
grep -r "fp-ts" app/routes/create.tsx app/components/WorkBulkCreateForm.tsx app/usecases/
```

**期待結果**: 該当なし (0行) であること

### 1-5. Result型の正しいimport確認

```bash
grep -n "from.*result" app/routes/create.tsx app/usecases/createWork.ts app/usecases/bulkCreateWorks.ts app/components/WorkBulkCreateForm.tsx
```

**期待結果**: 各ファイルで `Ok`, `Err`, `Result`, `AppError`, `errorToMessage`, `errorToStatus` などが `~/utils/result` から正しくimportされていること

---

## 2. 単一作品登録 (createWork) の動作確認

アプリケーションを起動:

```bash
npm run db:setup && npm run dev
```

### 2-1. 正常系: 作品の新規登録

1. `/create` にアクセス
2. 以下を入力:
   - タイトル: `テスト作品_正常` (シードデータと重複しない任意のタイトル)
   - 初回放送日時: 任意の将来日時
   - 話数: 13
3. 「送信」ボタンを押下

**期待結果**:
- 作品詳細ページ (`/works/{id}`) にリダイレクトされること
- DBに作品レコードが1件、エピソードレコードが13件作成されること

### 2-2. 異常系: タイトル未入力

1. `/create` にアクセス
2. タイトルを空欄のまま「送信」ボタンを押下

**期待結果**:
- HTTP 400 が返されること
- エラーメッセージ `title must not be empty` が表示されること
- DBに変更がないこと

### 2-3. 異常系: 放送日未入力

1. `/create` にアクセス
2. タイトルのみ入力し、放送日を空欄のまま「送信」ボタンを押下

**期待結果**:
- HTTP 400 が返されること
- エラーメッセージ `episodeDate must not be empty` が表示されること

### 2-4. 異常系: タイトル重複 (一意制約違反)

1. `/create` にアクセス
2. シードデータに存在するタイトル (例: `鬼滅の刃 柱稽古編`) を入力して「送信」ボタンを押下

**期待結果**:
- HTTP 409 が返されること
- `workRepo.create` が `Err({ type: "unique_constraint" })` を返すこと
- `errorToMessage` により `既に登録されています: title` のようなメッセージが表示されること

---

## 3. 一括作品登録 (bulkCreateWorks) の動作確認

### 3-1. 正常系: 複数作品の新規一括登録

1. `/create` にアクセス
2. 「複数入力する」ボタンを押下
3. テキストエリアに以下を入力:
   ```
   テスト一括1,2026-06-01T00:00:00.000Z,13
   テスト一括2,2026-07-01T00:00:00.000Z,12
   ```
4. 「送信」ボタンを押下 (`_action=bulkCreate`)

**期待結果**:
- HTTP 200 が返されること
- レスポンスに `{ action: "bulkCreate", workCount: 2, episodeCount: 25 }` が含まれること
- DBに作品2件、エピソード 25件 (13+12) が作成されること

### 3-2. 異常系: 空入力

1. `/create` にアクセス → 「複数入力する」
2. テキストエリアを空欄のまま「送信」

**期待結果**:
- HTTP 400 が返されること
- エラーメッセージ `登録しようとしている作品が0件です` が表示されること

### 3-3. 異常系: 一括登録時のタイトル重複

1. `/create` にアクセス → 「複数入力する」
2. テキストエリアに、シードデータと重複するタイトルを含めて入力:
   ```
   鬼滅の刃 柱稽古編,2024-05-12T01:23:00.000Z,8
   テスト一括3,2026-08-01T00:00:00.000Z,10
   ```
3. 「送信」ボタンを押下

**期待結果**:
- HTTP 409 が返されること
- `WorkRepository.createMany` が `Err({ type: "unique_constraint", duplicatedFields: ["title"] })` を返すこと
- Use Case内で `findManyByTitle` が呼ばれ、重複タイトルが特定されること
- エラーメッセージに `既に登録されています: 鬼滅の刃 柱稽古編` が含まれること
- DBに変更がないこと (`createMany` がロールバック、またはPrismaがトランザクション内で実行)

### 3-4. 境界系: 1件のみの一括登録

1. `/create` にアクセス → 「複数入力する」
2. テキストエリアに1件のみ入力:
   ```
   テスト一括4,2026-09-01T00:00:00.000Z,1
   ```
3. 「送信」

**期待結果**:
- 正常に登録完了 (HTTP 200)
- DBに作品1件、エピソード1件が作成されること

---

## 4. リポジトリ層のエラーハンドリング確認

### 4-1. `findManyByTitle` のエラー伝播

`WorkRepository.findManyByTitle` がDBエラーを返すパスの確認:

- **bulkCreateWorks の正常パス**: `createMany` 成功後の `findManyByTitle` が正常に動作し、作成した作品のIDを取得できること
- **bulkCreateWorks の unique_constraint エラーパス**: `createMany` がP2002で失敗した後、`findManyByTitle` で重複タイトルを特定できること

### 4-2. `isUniqueConstraintError` ヘルパーの動作

`app/adapters/repository/prisma/work.ts` の `isUniqueConstraintError` が:

- PrismaのP2002エラー(`PrismaClientKnownRequestError` with `code: "P2002"`) のみを正しく判定すること
- その他のエラー (接続エラー等) は `{ type: "db" }` にフォールバックすること

---

## 5. データ整合性の確認

### 5-1. 単一作品登録時のEpisode紐付け

シナリオ2-1で登録した作品について:

```sql
SELECT w.id, w.title, COUNT(e.count) AS episode_count
FROM Work w
LEFT JOIN Episode e ON e.workId = w.id
WHERE w.title = 'テスト作品_正常'
GROUP BY w.id;
```

**期待結果**: `episode_count` が入力した話数 (例: 13) と一致すること

### 5-2. 一括登録時のEpisode紐付け

シナリオ3-1で登録した作品について:

```sql
SELECT w.id, w.title, COUNT(e.count) AS episode_count
FROM Work w
LEFT JOIN Episode e ON e.workId = w.id
WHERE w.title LIKE 'テスト一括%'
GROUP BY w.id;
```

**期待結果**: 各作品の `episode_count` が入力した話数と一致すること

### 5-3. 一括登録時のEpisode公開日計算

一括登録で作成されたエピソードの `publishedAt` が、作品の初回放送日から週1ペース (7日間隔) で正しく計算されていること:

```
エピソード1: work.publishedAt
エピソード2: work.publishedAt + 7日
エピソード3: work.publishedAt + 14日
...
```

---

## 6. エッジケース確認

### 6-1: エピソード作成失敗時の挙動 (createWork)

**注意**: 現在の実装では、`WorkRepository.create` 成功後に `EpisodeRepository.createMany` が失敗した場合、作品は作成済みでエピソードが未作成の不整合状態が発生し得る。これは `docs/rearchitecture-plan.md` の「今後の課題」に記載済み。

このシナリオは手動では再現困難なため、ユニットテストで別途カバーすべき。

### 6-2: `errorToMessage` / `errorToStatus` のパターン網羅

| AppError type | errorToStatus | errorToMessage |
|--------------|---------------|----------------|
| `not_found` | 404 | `{resource}が見つかりません` |
| `validation` | 400 | `{message}` |
| `unique_constraint` | 409 | `既に登録されています: {fields}` |
| `unauthorized` | 401 | `ログインが必要です` |
| `forbidden` | 403 | `権限がありません` |
| `db` | 500 | `内部エラーが発生しました` |
| `internal` | 500 | `{message}` |

---

## 7. 回帰テスト (既存機能への影響確認)

### 7-1. 他ページの正常動作

以下のページが正常に表示されること:

- `/` (トップページ)
- `/works/{id}` (作品詳細ページ)
- `/login` (ログインページ)

### 7-2. 既存のfp-ts使用箇所が影響を受けていないこと

以下のファイルでfp-tsが依然として使用されていることを確認 (Step 5-7での除去予定):

```bash
grep -rl "fp-ts" app/
```

**期待結果**: `app/routes/works.$workId/server/action.ts`, `app/routes/_index.tsx`, `app/utils/middlewares.ts`, `app/domain/cour/util.ts`, `app/adapters/resultToEither.ts` が含まれ、今回の変更対象ファイルが含まれないこと

---

## 実施後のクリーンアップ

動作確認で作成したテストデータは、シナリオ終了後に以下でクリーンアップ:

```bash
npm run db:setup
```

または手動でDBの該当レコードを削除。