# アニメ知識グラフ機能 設計文書

## 概要

既存のWork（アニメ作品）とEpisode（単話）に対して、自由な関係で結びつく知識・概念のネットワークを構築する。

### 例
- Work「作品A」--「監督」--> Knowledge「浅香守生」
- Episode「作品A #1」--「特徴」--> Knowledge「OPカット」
- Knowledge「浅香守生」--「所属会社」--> Knowledge「MADHOUSE」

---

## 現在のデータモデル

### Work（アニメ作品）
- `id`, `title`, `publishedAt`, `durationMin`, `officialSiteUrl`, `twitterId`, `hashtag`
- 複数のEpisodeを持つ

### Episode（アニメ単話）
- `workId`, `count`, `publishedAt`, `title`, `description`
- 複合主キー: `(workId, count)`

---

## 設計上の判断ポイント

### 1. KnowledgeNodeの分類方法

#### 案A: typeフィールドを持つ
```prisma
model KnowledgeNode {
  id       Int    @id @default(autoincrement())
  name     String
  nodeType String // "creator", "company", "concept" etc.
  content  String? @db.Text
}
```

**メリット:**
- 一覧取得が単純: `WHERE nodeType = 'creator'`
- 型安全性が高い（enum化可能）
- 運用ミスが発生しにくい

**デメリット:**
- グラフの自己完結性が損なわれる（「型」がグラフの外側にある）
- nodeTypeの追加・変更時にスキーマ変更が必要
- 「浅香守生はcreatorであり、同時にMADHOUSE所属でもある」のような複合分類が表現しにくい

#### 案B: 型ノードを別途立てる（グラフで表現）
```prisma
model KnowledgeNode {
  id      Int    @id @default(autoincrement())
  name    String @unique
  content String? @db.Text
}

// 例:
// KnowledgeNode { name: "MADHOUSE" }
// KnowledgeNode { name: "Company", content: "制作会社の分類ノード" }
// Edge: MADHOUSE --[is_a]--> Company
```

**メリット:**
- グラフが自己完結する（すべての知識がノードとエッジで表現される）
- 柔軟性が高い（複合分類、階層構造も表現可能）
- 「Companyノードの一覧」がそのままCompanyノードのページになる
- スキーマ変更不要で新しい型を追加できる

**デメリット:**
- 一覧取得にJOINが必要
- 運用者が型ノードの作成やis_aエッジの作成を忘れる可能性がある
- 型ノードのIDをシステムが知る必要がある（名前で解決は可能）

---

### 2. Work/Episodeとの相互運用性

#### 案A: Work/EpisodeにもknowledgeNodeIdを追加
```prisma
model KnowledgeNode {
  id   Int    @id @default(autoincrement())
  name String @unique
  // typeフィールドは持たない
}

model Work {
  id              Int @id @default(autoincrement())
  knowledgeNodeId Int @unique
  knowledgeNode   KnowledgeNode @relation(...)
  // ... existing fields
}

model Episode {
  id              Int @id @default(autoincrement())
  knowledgeNodeId Int @unique
  knowledgeNode   KnowledgeNode @relation(...)
  // ... existing fields
}
```

**メリット:**
- Work/EpisodeもKnowledgeNodeの一種として統一的に扱える
- エッジはKnowledgeNode.idだけを参照（work/episode/knowledgeの区別を知らない）
- グラフの純粋性が高い

**デメリット:**
- Work/Episodeテーブルに外部キーを追加する必要がある（移行コスト）
- Work/Episodeの情報を取得するにはKnowledgeNodeを経由する必要がある
- 既存のクエリロジックを変更する必要がある

#### 案B: Work/Episode用のエイリアスKnowledgeNodeを作成
```prisma
model KnowledgeNode {
  id        Int    @id @default(autoincrement())
  name      String @unique
  nodeType  String // "work" | "episode" | "knowledge"
  workId    Int?   // nodeType="work" の場合
  episodeId Int?   // nodeType="episode" の場合
  content   String? @db.Text
}
```

**メリット:**
- Work/Episodeテーブルは既存のまま（移行コストが低い）
- KnowledgeNodeにURL生成に必要な情報がすべてある
- Prismaの通常のクエリで完結（UNION ALL不要）

**デメリット:**
- KnowledgeNodeにtypeフィールドが必要
- Work/Episode作成時にエイリアスKnowledgeNodeも作成する必要がある
- データの重複が発生する（Work.title と KnowledgeNode.name）

---

## 必要な仕様（機能要件）

### ナレッジノード
- 作成、編集、削除
- 名前、内容（フリーフォーマット、markdown等）
- 単独のページを持つ（`/knowledge/:id`）

### エッジ
- 作成、削除
- エッジ種別（EdgeType）を持つ（「監督」「所属会社」「is_a」等）
- 2つのKnowledgeNodeを結ぶ（有向）

### ノードページの表示
- ノード情報（名前、内容）
- 1-hop近傍のエッジ一覧（エッジ種別でグルーピング）
- 各エッジの先方ノードへのリンク

### リンク先URL
- Workノード: `/works/:workId`
- Episodeノード: `/works/:workId/:count`
- Knowledgeノード: `/knowledge/:id`

---

## 未決定事項

### 1. KnowledgeNodeの分類方法
- **案A（typeフィールド）**: 実装が単純、運用ミスが少ない
- **案B（型ノード）**: グラフの自己完結性が高い、柔軟性が高い

**検討ポイント:**
- 「型」はグラフの一部か、それともメタ情報か
- 運用の裁量をどこまで許容するか
- 将来的にグラフ探索・推論を行う可能性があるか

### 2. Work/Episodeとの相互運用性
- **案A（knowledgeNodeId追加）**: グラフの純粋性が高い、移行コストが高い
- **案B（エイリアス作成）**: 移行コストが低い、KnowledgeNodeにtypeが必要

**検討ポイント:**
- 既存のWork/Episodeテーブルを変更するコスト
- 運用の複雑さ（エイリアス作成の自動化）
- クエリのシンプルさ

---

## 推奨案（暫定）

### 分類方法: 案B（型ノード）
- グラフの自己完結性を重視
- 運用の裁量を許容（is_aエッジの張り忘れは気づいたときに修正）
- 将来的な拡張性

### 相互運用性: 案B（エイリアス作成）
- 既存テーブルの変更を避けたい
- Work/Episode作成時にKnowledgeNodeを自動作成すれば運用コストは低い
- nodeTypeは "work" | "episode" | "knowledge" の3種類に限定

**ただし、この組み合わせだとKnowledgeNodeにnodeTypeが必要になるため、案Bの「型ノード」アプローチと矛盾する。**

### 矛盾の解決策

#### 選択肢1: 案A + 案A
- KnowledgeNodeにtypeフィールドを持つ
- Work/EpisodeにもknowledgeNodeIdを追加
- 最もシンプルだが、既存テーブルの変更が必要

#### 選択肢2: 案B + 案B
- KnowledgeNodeにnodeTypeを持つ（"work" | "episode" | "knowledge"）
- Work/Episodeは既存のまま、エイリアスKnowledgeNodeを作成
- 「型ノード」アプローチは放棄し、typeフィールドで分類

#### 選択肢3: 案B + 案A
- KnowledgeNodeにtypeフィールドを持たない
- Work/EpisodeにknowledgeNodeIdを追加
- Work/EpisodeもKnowledgeNodeの一種として統一的に扱う
- 最も純粋なグラフ設計

---

## レビュー指摘（2026-06-17）

### 「矛盾」は実在しない — 2種類のtypeを分離せよ

194行目で指摘されている「矛盾」は、2つの異なる概念を同一の `type` / `nodeType` で扱っていることに起因する幻影である。

- **(a) 構造的種別** … `work / episode / knowledge`。このノードをどのURL・どのレコードに解決するかという実装上の関心。
- **(b) 意味的分類** … `creator / company / concept`。アニメ知識のドメイン上の分類（タクソノミー）。

案B相互運用（エイリアス）が要求する `nodeType`（=構造的種別 a）と、案B分類が拒否する `type`フィールド（=意味的分類 b）は別物であり、**共存して何ら矛盾しない**。

- (b) 意味的分類 → グラフ（`is_a` エッジ）で表現。これが知識グラフ機能の存在意義そのもの。
- (a) 構造的種別 → グラフでは表現できない（`is_a` でURLは導けない）。明示的に持つしかない。

### 判断1（分類方法）: 案B（型ノード）に賛成

意味的分類をフィールドに固定するのは、自由な知識グラフという前提と戦うことになる。案Bが正しい。`is_a` の張り忘れは気づいたら直すという運用許容も、個人運用の規模では妥当。

ただし「全Company一覧」のような取得が `is_a` エッジのtraversal前提になる点は受け入れる覚悟が必要。

### 判断2（相互運用性）: 案A（knowledgeNodeId追加）を推す — 文書の評価は逆

文書は案Aの移行コストを高く見積もり案B（エイリアス）に傾いているが、以下の理由で逆の評価とする。

案B（エイリアス）の致命的な弱点は **`Work.title` と `KnowledgeNode.name` のデータ二重化**（132行目）。同期ズレという恒常的な正しさのハザードを抱え込む。

案Aの利点：

- エッジが `KnowledgeNode.id` だけを一様に参照できる（グラフの最大の価値）
- KnowledgeNodeに optional な back-relation `work Work?` / `episode Episode?` を持たせれば、**`nodeType` 文字列すら不要**。リレーションの有無が構造的種別の判別子になる（型安全・ドリフトなし）
- 移行は「既存Work/Episode分のKnowledgeNodeを作ってFKを張る」一回限りのバックフィルスクリプトで完了。このアプリの規模（個人運用、MySQL）なら移行コストは過大評価

### 推奨: 選択肢3（案B分類 + 案A相互運用）

`nodeType` 文字列がスキーマ上どこにも現れない最もクリーンな形。文書自身も「最も純粮」と認めている。

```prisma
model KnowledgeNode {
  id      Int    @id @default(autoincrement())
  name    String?
  content String? @db.Text

  work        Work?
  episode     Episode?
  outgoingEdges KnowledgeEdge[] @relation("FromNode")
  incomingEdges KnowledgeEdge[] @relation("ToNode")
}

model KnowledgeEdge {
  id        Int    @id @default(autoincrement())
  fromId    Int
  toId      Int
  edgeType  String // "監督", "所属会社", "is_a" 等
  from      KnowledgeNode @relation("FromNode", fields: [fromId], references: [id])
  to        KnowledgeNode @relation("ToNode", fields: [toId], references: [id])

  @@unique([fromId, toId, edgeType])
}

model Work {
  id              Int    @id @default(autoincrement())
  knowledgeNodeId Int    @unique
  knowledgeNode   KnowledgeNode @relation(fields: [knowledgeNodeId], references: [id])
  // ... existing fields
}

model Episode {
  id              Int    @id @default(autoincrement())
  knowledgeNodeId Int    @unique
  knowledgeNode   KnowledgeNode @relation(fields: [knowledgeNodeId], references: [id])
  workId          Int
  count           Int
  // ... existing fields

  @@id(fields: [workId, count])
}
```

構造的種別の判別：

```ts
// KnowledgeNode の構造的種別は back-relation の有無で判定
function getKind(node: KnowledgeNode): "work" | "episode" | "knowledge" {
  if (node.work) return "work";
  if (node.episode) return "episode";
  return "knowledge";
}
```

### 文書が見落としている論点

#### 1. `name @unique` の破綻

選択肢3でWork/Episodeをノード化すると、`Episode.title` はnullable・非ユニークなので `KnowledgeNode.name` のグローバルユニーク制約と衝突する。

対策：Work/Episode由来ノードは `name` を持たず、表示名はリレーション先（`Work.title`, `Episode.title`）から導出する。`name` は nullable かつ非ユニークとする（MySQLは部分ユニーク制約が扱いにくいため）。

#### 2. エッジの重複・自己ループ防止

- `@@unique([fromId, toId, edgeType])` で重複防止
- `fromId == toId` の自己ループ禁止をアプリケーション層で検証

#### 3. 削除カスケード

- ノード削除時にそのエッジを巻き込み削除（`onDelete: Cascade`）
- Work/Episode由来ノードの単独削除は**DB層の外部キー制約で自動的に禁止される**（Work/EpisodeがKnowledgeNodeを参照しているため）
- Work/Episodeが削除されたときだけ、そのKnowledgeNodeもカスケード削除される
- 現状の `EpisodeStatusOnUser` が `onDelete: Restrict`（54行目）であることと整合を取ること（ユーザーが視聴記録を持つEpisodeは削除できない）

#### 4. 逆方向ラベル

ノードページは1-hop近傍を「入ってくるエッジ」も含めて表示する（150行目）。`A --監督--> B` をB側で見たとき「監督」では意味が通らない。逆方向の表示ラベル（「監督作品」等）を持つか、方向を明示して描画するか決める必要がある。

候補：

- (a) `reverseLabel String?` をEdgeに追加（例: `edgeType="監督", reverseLabel="監督作品"`）
- (b) フロントエンドで方向を明示（例: 「← 監督: 浅香守生」）

#### 5. インデックス

1-hop近傍取得のため `fromId` / `toId` 双方にインデックス必須。

#### 6. Episodeの主キー

Episodeは複合主キー `(workId, count)` を持ち単一idがない。エッジは `KnowledgeNode.id`（単一int）を参照するため、Episodeがグラフに参加するにはノード化が必須。選択肢3を採る場合、Episodeに `knowledgeNodeId @unique` と単一id（Prismaの `@id @default(autoincrement())`）を追加するのが自然。既存の `@@id(fields: [workId, count])` は `@@unique` に格下げして互換性を維持する。

---

## 次のステップ

1. 上記の選択肢から設計方針を決定
2. Prismaスキーマを確定
3. 移行スクリプトの作成（必要な場合）
4. 実装着手
