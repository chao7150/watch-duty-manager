# アニメ知識グラフ機能 実装指示書

## 目的

`Work`（アニメ作品）、`Episode`（単話）、自由記述の知識ノードを、同じ `KnowledgeNode` として扱える知識グラフ機能を実装する。

実装方針は `docs/knowledge-graph-design.md` の「選択肢3（案B分類 + 案A相互運用）」を採用する。

- 意味的分類（creator / company / concept など）は `is_a` エッジで表現する
- 構造的種別（work / episode / knowledge）は `nodeType` 文字列を持たず、`Work` / `Episode` からの back-relation の有無で判定する
- `Work.title` や `Episode.title` を `KnowledgeNode.name` にコピーしない
- `KnowledgeNode.name` は純粋な知識ノードだけで使う

## 実装範囲

今回のMVPで実装すること：

- `KnowledgeNode` / `KnowledgeEdge` のPrismaモデル追加
- 既存 `Work` / `Episode` への `knowledgeNodeId` 追加
- 既存データに対する `KnowledgeNode` バックフィル
- `Work` / `Episode` 作成時に対応する `KnowledgeNode` を自動作成
- 純粋な知識ノードの作成、編集、削除
- エッジの作成、削除
- `/knowledge` 一覧ページ
- `/knowledge/:nodeId` 詳細ページ
- Workページ / Episodeページから対応するKnowledgeNodeページへのリンク
- Repository / Usecase / Route / Integration test の追加・更新

今回やらないこと：

- グラフ可視化ライブラリの導入
- `nodeType` カラムの追加
- `KnowledgeNode.name` のユニーク制約
- `EdgeType` マスタテーブル化
- Markdownレンダラ導入（`content` はまず `white-space: pre-wrap` で表示する）
- 逆方向ラベルカラム（今回は方向をUIで明示する）

## 重要な設計ルール

### 1. `nodeType` は作らない

構造的種別は以下で判定する。

```ts
type KnowledgeNodeKind = "work" | "episode" | "knowledge";

function getKnowledgeNodeKind(node: {
  work?: unknown | null;
  episode?: unknown | null;
}): KnowledgeNodeKind {
  if (node.work) return "work";
  if (node.episode) return "episode";
  return "knowledge";
}
```

### 2. 表示名はリレーション先から導出する

- Workノード: `Work.title`
- Episodeノード: `Episode.title` があればそれを使い、なければ `Work.title + " #" + Episode.count` を使う
- 純粋な知識ノード: `KnowledgeNode.name`

`Work.title` / `Episode.title` を `KnowledgeNode.name` に保存してはいけない。同期ズレを作らないため。

### 3. `KnowledgeNode.name` は nullable かつ非unique

Work/Episode由来ノードは `name = null` のままにする。

純粋な知識ノードの `name` 必須チェックはアプリケーション層で行う。

### 4. エッジの重複と自己ループ

- DB層: `@@unique([fromId, toId, edgeType])` で同じエッジの重複を禁止する
- アプリケーション層: `fromId === toId` の自己ループを禁止する

### 5. 削除の扱い

`Work` / `Episode` が `knowledgeNodeId` を持つ設計なので、DB制約の向きに注意すること。

- `KnowledgeNode` を削除したとき、そのノードに接続する `KnowledgeEdge` はDB層でカスケード削除する
- `Work` / `Episode` が参照している `KnowledgeNode` の単独削除はDB層で拒否される
- `Work` / `Episode` を削除しても、DBのFKだけでは `KnowledgeNode` は自動削除されない
- `Work` / `Episode` 削除時は、Repositoryのトランザクション内で対応する `KnowledgeNode` も削除する
- `Work.knowledgeNode` / `Episode.knowledgeNode` の relation に `onDelete: Cascade` を付けてはいけない。付けると「KnowledgeNode削除時にWork/Episodeも削除」の意味になる

既存の `EpisodeStatusOnUser` は `onDelete: Restrict` なので、視聴記録があるEpisodeは削除できない。この挙動は維持する。

## 実装手順

### Step 1. Prismaスキーマを変更する

対象ファイル：

- `prisma/schema.prisma`

最終形は以下を目標にする。

```prisma
model KnowledgeNode {
  id        Int      @id @default(autoincrement())
  name      String?
  content   String?  @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  work    Work?
  episode Episode?

  outgoingEdges KnowledgeEdge[] @relation("FromNode")
  incomingEdges KnowledgeEdge[] @relation("ToNode")

  @@index([name])
}

model KnowledgeEdge {
  id        Int      @id @default(autoincrement())
  fromId    Int
  toId      Int
  edgeType  String
  createdAt DateTime @default(now())

  from KnowledgeNode @relation("FromNode", fields: [fromId], references: [id], onDelete: Cascade)
  to   KnowledgeNode @relation("ToNode", fields: [toId], references: [id], onDelete: Cascade)

  @@unique([fromId, toId, edgeType])
  @@index([fromId])
  @@index([toId])
  @@index([edgeType])
}

model Work {
  id              Int @id @default(autoincrement())
  knowledgeNodeId Int @unique
  knowledgeNode   KnowledgeNode @relation(fields: [knowledgeNodeId], references: [id], onDelete: Restrict)

  episodes        Episode[]
  title           String @unique
  publishedAt     DateTime
  durationMin     Int @default(30)
  officialSiteUrl String?
  twitterId       String?
  hashtag         String?
  users           SubscribedWorksOnUser[]
}

model Episode {
  id              Int @id @default(autoincrement())
  knowledgeNodeId Int @unique
  knowledgeNode   KnowledgeNode @relation(fields: [knowledgeNodeId], references: [id], onDelete: Restrict)

  work                Work @relation(fields: [workId], references: [id])
  workId              Int
  count               Int
  publishedAt         DateTime
  title               String?
  description         String?
  EpisodeStatusOnUser EpisodeStatusOnUser[]

  @@unique([workId, count])
}
```

注意点：

- 既存の `Episode` は `@@id([workId, count])` なので、単一 `id` を追加したら `(workId, count)` は `@@unique` に変更する
- `EpisodeStatusOnUser` の relation は引き続き `[workId, count]` を参照させる
- `EpisodeStatusOnUser` の `onDelete: Restrict` / `onUpdate: Cascade` は維持する
- `KnowledgeEdge.from` / `KnowledgeEdge.to` の `onDelete: Cascade` は必須
- `Work.knowledgeNode` / `Episode.knowledgeNode` は `onDelete: Restrict` を明示する

### Step 2. マイグレーションを2段階で作る

既存データがあるため、いきなり `knowledgeNodeId Int` の必須カラムを追加しない。

1つ目のマイグレーション：

- `KnowledgeNode` / `KnowledgeEdge` テーブルを作る
- `Work.knowledgeNodeId` を nullable で追加する
- `Episode.id` を追加する
- `Episode.knowledgeNodeId` を nullable で追加する
- `(Episode.workId, Episode.count)` を unique にする
- `EpisodeStatusOnUser` の外部キーが壊れていないことを確認する

バックフィル後の2つ目のマイグレーション：

- `Work.knowledgeNodeId` を required にする
- `Episode.knowledgeNodeId` を required にする
- unique制約と外部キー制約を最終形にする

コマンド例：

```bash
npx prisma migrate dev --create-only --name add_knowledge_graph_tables
```

生成されたSQLは必ず確認する。特に `Episode` の主キー変更と `EpisodeStatusOnUser` の外部キー再作成部分を確認すること。

実行順は必ず以下にする。

1. 1つ目のマイグレーションを適用する
2. バックフィルスクリプトを実行する
3. 2つ目のマイグレーションを作成・適用して `knowledgeNodeId` をrequiredにする

バックフィルスクリプトは、`knowledgeNodeId` が nullable の中間スキーマで実行する。最終スキーマ適用後は `where: { knowledgeNodeId: null }` が型上使えなくなる。

### Step 3. バックフィルスクリプトを作る

対象ファイル：

- `prisma/backfill-knowledge-nodes.ts` を新規作成

やること：

- `knowledgeNodeId IS NULL` のWorkを全件取得する
- Workごとに空の `KnowledgeNode` を作成し、`Work.knowledgeNodeId` に設定する
- `knowledgeNodeId IS NULL` のEpisodeを全件取得する
- Episodeごとに空の `KnowledgeNode` を作成し、`Episode.knowledgeNodeId` に設定する
- `KnowledgeNode.name` は設定しない
- 同じスクリプトを2回実行しても重複ノードを作らないよう、`knowledgeNodeId IS NULL` だけを対象にする

実装例の方針：

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    const works = await tx.work.findMany({
      where: { knowledgeNodeId: null },
      select: { id: true },
    });

    for (const work of works) {
      const node = await tx.knowledgeNode.create({ data: {} });
      await tx.work.update({
        where: { id: work.id },
        data: { knowledgeNodeId: node.id },
      });
    }

    const episodes = await tx.episode.findMany({
      where: { knowledgeNodeId: null },
      select: { id: true },
    });

    for (const episode of episodes) {
      const node = await tx.knowledgeNode.create({ data: {} });
      await tx.episode.update({
        where: { id: episode.id },
        data: { knowledgeNodeId: node.id },
      });
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
```

実行コマンド：

```bash
node --experimental-strip-types prisma/backfill-knowledge-nodes.ts
```

### Step 4. seedとテストDB初期化を更新する

対象ファイル：

- `prisma/seed.ts`
- `app/test/integration-setup.ts`

`seed.ts`：

- Work作成時に `knowledgeNode: { create: {} }` を付ける
- Episode作成は `createMany` ではなく、1件ずつ `knowledgeNode: { create: {} }` 付きで作成する

`integration-setup.ts`：

削除順を以下に変更する。

```ts
await db.knowledgeEdge.deleteMany();
await db.episodeStatusOnUser.deleteMany();
await db.subscribedWorksOnUser.deleteMany();
await db.episode.deleteMany();
await db.work.deleteMany();
await db.knowledgeNode.deleteMany();
```

理由：`Work` / `Episode` が `KnowledgeNode` を参照するため、先に `KnowledgeNode` を消すと外部キー制約で失敗する。

### Step 5. WorkRepository / EpisodeRepositoryを更新する

対象ファイル：

- `app/adapters/repository/prisma/work.ts`
- `app/adapters/repository/prisma/episode.ts`
- `app/domain/work/types.ts`
- 必要なら `app/domain/work/repository.ts`
- 必要なら `app/domain/episode/types.ts`

Work作成：

- `db.work.create({ data })` をやめる
- `knowledgeNode: { create: {} }` を含めて作成する
- 返り値は既存通り `{ id }`

```ts
const work = await db.work.create({
  data: {
    ...data,
    knowledgeNode: { create: {} },
  },
});
```

Work一括作成：

- `createMany` は nested create が使えないため、そのままでは使えない
- `db.$transaction` の中で1件ずつ `db.work.create` する
- 既存の `unique_constraint` エラー処理は維持する

Episode一括作成：

- `db.episode.createMany` は nested create が使えないため、そのままでは使えない
- `db.$transaction` の中で1件ずつ `tx.episode.create` する
- 返り値の `count` は作成した入力配列の長さでよい

```ts
await db.$transaction(async (tx) => {
  for (const episode of data) {
    await tx.episode.create({
      data: {
        ...episode,
        knowledgeNode: { create: {} },
      },
    });
  }
});
```

Episode削除：

既存の `deleteAndReorder` は、削除対象Episodeの `knowledgeNodeId` を取得し、Episode削除後に対応する `KnowledgeNode` も同じトランザクションで削除する。

実装順序：

1. `tx.episode.findUnique` で削除対象の `knowledgeNodeId` を取得する
2. `tx.episode.delete` でEpisodeを削除する
3. `tx.knowledgeNode.delete` で対応ノードを削除する
4. `tx.episode.updateMany` で後続Episodeの `count` を詰める

`EpisodeStatusOnUser` が残っているEpisodeの削除は、既存通りDBの `Restrict` で失敗させる。

### Step 6. Knowledge domain / repositoryを追加する

追加候補ファイル：

- `app/domain/knowledge/types.ts`
- `app/domain/knowledge/repository.ts`
- `app/adapters/repository/prisma/knowledge.ts`

最低限必要な型：

```ts
export type KnowledgeNodeKind = "work" | "episode" | "knowledge";

export type KnowledgeNodeSummary = {
  id: number;
  kind: KnowledgeNodeKind;
  label: string;
  url: string;
};

export type KnowledgeNeighbor = {
  edgeId: number;
  edgeType: string;
  direction: "outgoing" | "incoming";
  node: KnowledgeNodeSummary;
};

export type KnowledgeNodeDetail = KnowledgeNodeSummary & {
  content: string | null;
  outgoing: KnowledgeNeighbor[];
  incoming: KnowledgeNeighbor[];
};
```

Repository interfaceの最低限：

```ts
export interface KnowledgeRepository {
  findMany(): Promise<KnowledgeNodeSummary[]>;
  findById(id: number): Promise<KnowledgeNodeDetail | null>;
  createNode(data: { name: string; content?: string | null }): Promise<Result<{ id: number }, AppError>>;
  updateNode(id: number, data: { name: string; content?: string | null }): Promise<Result<void, AppError>>;
  deleteNode(id: number): Promise<Result<void, AppError>>;
  createEdge(data: { fromId: number; toId: number; edgeType: string }): Promise<Result<void, AppError>>;
  deleteEdge(id: number): Promise<Result<void, AppError>>;
}
```

Repository実装のルール：

- `findMany` / `findById` は `work` と `episode.work` をincludeして表示名とURLを組み立てる
- Work URLは `/works/:workId`
- Episode URLは `/works/:workId/:count`
- 純粋な知識ノード URLは `/knowledge/:nodeId`
- `createNode` は `name.trim()` が空なら validation error
- `updateNode` はWork/Episode由来ノードなら validation error にする。Work/Episode由来ノードの表示名はWork/Episode側で編集するため
- `deleteNode` は純粋な知識ノードだけ許可する。Work/Episode由来ノードはDBでも拒否されるが、事前に validation error を返すとUIが扱いやすい
- `createEdge` は `fromId === toId` を validation error にする
- `createEdge` の重複はPrisma `P2002` を拾って `unique_constraint` にする
- `deleteEdge` は存在しなければ `not_found` にする

### Step 7. Knowledge usecaseを追加する

追加候補ファイル：

- `app/usecases/createKnowledgeNode.ts`
- `app/usecases/updateKnowledgeNode.ts`
- `app/usecases/deleteKnowledgeNode.ts`
- `app/usecases/createKnowledgeEdge.ts`
- `app/usecases/deleteKnowledgeEdge.ts`
- または小さく始めるなら `app/usecases/knowledge.ts` にまとめてもよい

このプロジェクトはusecaseがRepositoryを受け取る形なので、それに合わせる。

例：

```ts
export const createKnowledgeEdge =
  (repos: { knowledgeRepo: KnowledgeRepository }) =>
  async (input: { fromId: number; toId: number; edgeType: string }) => {
    return repos.knowledgeRepo.createEdge(input);
  };
```

バリデーションはRepositoryだけでなくusecase側で行ってもよいが、同じチェックをRouteに分散させないこと。

### Step 8. ルートを追加する

追加ファイル：

- `app/routes/knowledge._index.tsx`
- `app/routes/knowledge.$nodeId.tsx`

`flatRoutes` を使っているため、ファイルを追加すれば `/knowledge` と `/knowledge/:nodeId` が生える。

`app/routes/knowledge._index.tsx`：

- loader: `knowledgeRepo.findMany()` で一覧取得
- action: 純粋な知識ノード作成
- UI: 一覧 + 作成フォーム
- 作成成功時は `/knowledge/:nodeId` に redirect

`app/routes/knowledge.$nodeId.tsx`：

- `bindUrl` を定義する
- loader: `knowledgeRepo.findById(Number(params.nodeId))`
- not foundなら404 Responseをthrowする
- action:
  - `_action=update_node`: 純粋な知識ノード更新
  - `_action=delete_node`: 純粋な知識ノード削除
  - `_action=create_edge`: エッジ作成
  - `_action=delete_edge`: エッジ削除
- UI:
  - ノード表示名、種別、本文
  - Work/Episode由来ノードなら元ページへのリンク
  - outgoing edges: `このノード --edgeType--> 相手ノード`
  - incoming edges: `相手ノード --edgeType--> このノード`
  - エッジ作成フォーム（`toId` と `edgeType` 入力）
  - エッジ削除ボタン

逆方向ラベルは今回は持たない。incomingも、矢印と方向を明示すれば意味が崩れない。

### Step 9. 既存ページからKnowledgeNodeへリンクする

対象候補：

- `app/routes/works.$workId/route.tsx`
- `app/routes/works.$workId/server/loader.ts`
- `app/routes/works.$workId.$count.tsx`
- `app/domain/work/types.ts`
- `app/adapters/repository/prisma/work.ts`

Work詳細ページ：

- loaderで `work.knowledgeNodeId` を返す
- 画面上部か作品情報セクションに「Knowledge」リンクを追加する
- URLは `/knowledge/:knowledgeNodeId`

Episode詳細ページ：

- `db.episode.findUnique` の返り値に `knowledgeNodeId` が含まれるので、それを使って「Knowledge」リンクを追加する

### Step 10. ナビゲーションにKnowledgeを追加する

対象ファイル：

- `app/root.tsx`
- `app/components/mobileNavigation.tsx`

PCナビとモバイルナビの両方に `/knowledge` へのリンクを追加する。

### Step 11. テストを追加・更新する

最低限追加するテスト：

Repository test：

- `workRepository.create` が `knowledgeNodeId` 付きのWorkを作る
- `workRepository.createMany` が各WorkにKnowledgeNodeを作る
- `episodeRepository.createMany` が各EpisodeにKnowledgeNodeを作る
- `episodeRepository.deleteAndReorder` が削除したEpisodeのKnowledgeNodeも削除する
- `knowledgeRepository.createNode` が純粋な知識ノードを作る
- `knowledgeRepository.createEdge` がエッジを作る
- `knowledgeRepository.createEdge` が自己ループを拒否する
- `knowledgeRepository.createEdge` が重複を拒否する
- `knowledgeRepository.deleteNode` が純粋な知識ノードのエッジも消す
- `knowledgeRepository.deleteNode` がWork/Episode由来ノードの削除を拒否する

Route / integration test：

- `/knowledge` が表示できる
- `/knowledge` から知識ノードを作成できる
- `/knowledge/:nodeId` がoutgoing/incomingエッジを表示できる
- Work詳細ページにKnowledgeリンクが出る
- Episode詳細ページにKnowledgeリンクが出る

既存テストの更新：

- `db.episode.createMany` を直接使っているテストは、必須 `knowledgeNodeId` のため失敗する。`episodeRepository.createMany` を使うか、1件ずつ `knowledgeNode: { create: {} }` 付きで作る
- `Episode` の一意キー名が変わる可能性がある。`where: { workId_count: { workId, count } }` が生成され続けるか確認し、Prisma Client生成後の型に合わせる
- mock repositoryにメソッドを追加した場合、usecase testのmockも更新する

## 受け入れ条件

以下をすべて満たしたら完了。

- `prisma/schema.prisma` に `KnowledgeNode` / `KnowledgeEdge` が追加されている
- `Work` と `Episode` が `knowledgeNodeId` を持つ
- `Episode` が単一 `id` を持ち、`(workId, count)` はuniqueとして維持されている
- 既存Work/Episode全件に対応する `KnowledgeNode` が存在する
- 新規Work作成時に対応する `KnowledgeNode` が作成される
- 新規Episode作成時に対応する `KnowledgeNode` が作成される
- 純粋な知識ノードを `/knowledge` から作成できる
- `/knowledge/:nodeId` でノード詳細と1-hop近傍を見られる
- エッジを作成・削除できる
- 同じ `(fromId, toId, edgeType)` のエッジを重複作成できない
- `fromId === toId` のエッジを作成できない
- Work/Episode由来ノードを通常の知識ノード編集フォームで改名できない
- Work/Episode由来ノードを通常の知識ノード削除フォームで削除できない
- 純粋な知識ノード削除時に関連エッジが残らない
- Episode削除時に対応する `KnowledgeNode` も削除される
- 視聴記録があるEpisodeの削除は既存通り失敗する
- PCナビとモバイルナビから `/knowledge` に移動できる

## 動作確認コマンド

実装後に以下を実行する。

```bash
npx prisma generate
npm run test:tsc
npm run test
npm run test:integration
npm run check
npm run build
```

マイグレーションを伴うため、ローカルDBでは以下の順番で確認する。

```bash
npx prisma migrate dev --create-only --name add_knowledge_graph_tables
npx prisma migrate dev
node --experimental-strip-types prisma/backfill-knowledge-nodes.ts
npx prisma migrate dev --create-only --name require_knowledge_node_ids
npx prisma migrate dev
```

## 実装時にやってはいけないこと

- `KnowledgeNode` に `nodeType` を追加しない
- `KnowledgeNode.name` に `@unique` を付けない
- Work/Episodeタイトルを `KnowledgeNode.name` にコピーしない
- `Work.knowledgeNode` / `Episode.knowledgeNode` に `onDelete: Cascade` を付けない
- `KnowledgeEdge` の重複制約をアプリケーション層だけにしない
- `fromId === toId` の自己ループチェックをDB制約だけで実現しようとしない
- `EpisodeStatusOnUser` の `onDelete: Restrict` を消さない
- 既存の `/works/:workId/:count` URLを壊さない

## 困ったときの確認ポイント

- `KnowledgeNode` が削除できない場合、Work/Episodeが参照していないか確認する
- Episode削除が失敗する場合、`EpisodeStatusOnUser` が残っていないか確認する
- `createMany` が失敗する場合、nested createが使えない箇所で `knowledgeNodeId` 必須になっていないか確認する
- Work/Episodeの表示名が空になる場合、`KnowledgeNode.name` ではなくWork/Episode側のリレーションをincludeしているか確認する
- エッジ一覧が遅い場合、`KnowledgeEdge.fromId` / `KnowledgeEdge.toId` のindexがあるか確認する
