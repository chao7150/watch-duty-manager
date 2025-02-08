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

```
npm i
sudo nerdctl compose -f container/compose.local.yml up -d db
npx prisma generate
npx prisma db push
npm run dev
```
