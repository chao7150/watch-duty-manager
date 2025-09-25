## watch-duty-manager

アニメ視聴を管理するためのwebアプリケーションです。Animetickの自分用アレンジです。

できること

- アニメ作品
  - 登録
  - 視聴登録/解除
- 作品のエピソード
  - 視聴完了登録/解除
  - コメント投稿

## 技術スタック

- Remix
- Prisma/MySQL
- Firebase Authentication

## 開発

このdevcontainerを開くと、自動的にseedデータが投入されます。

```bash
npm run dev  # 開発サーバー起動
```

### 利用可能なスクリプト

- `npm run dev` - 開発サーバー起動
- `npm run db:setup` - データベースセットアップ（push + seed）

### Manual Setup（devcontainer以外で開発する場合）

```bash
npm i
sudo nerdctl compose -f container/compose.local.yml up -d db
npx prisma generate
npm run db:setup  # 初回のみ
npm run dev
```
