# Issue #3: セキュリティ: SECRET環境変数のフォールバック値を削除

**作成日**: 2025-07-03  
**優先度**: Critical  
**ラベル**: bug, security, priority:critical

## 問題
`utils/session.server.ts`で環境変数SECRETのフォールバック値として`"s3cret1"`がハードコードされている。

## リスク
本番環境でこのデフォルト値が使用された場合、セッション情報が容易に偽造される可能性がある。

## 改善案
1. フォールバック値を削除し、環境変数が未設定の場合はエラーを投げる
2. 環境変数の設定状況をアプリケーション起動時にチェック
3. .env.exampleファイルに必須環境変数を明記

```typescript
// Before
const secret = process.env.SECRET ?? "s3cret1";

// After
const secret = process.env.SECRET;
if (!secret) {
  throw new Error('SECRET environment variable is required');
}
```