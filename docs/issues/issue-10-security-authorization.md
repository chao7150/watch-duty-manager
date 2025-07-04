# Issue #10: セキュリティ: 認可チェックの一貫性確保

**作成日**: 2025-07-03  
**優先度**: High  
**ラベル**: bug, security, priority:high

## 問題
一部のルートで認可チェック（requireUserId）が適用されていない可能性がある。

## リスク
- 未認証ユーザーが保護されたリソースにアクセス
- データの不正な閲覧・変更

## 改善案
1. **ミドルウェアの統一**
   - すべての保護されたルートでrequireUserIdを使用
   - 共通の認可ミドルウェアを作成
   
2. **ルートの監査**
   ```typescript
   // app/utils/auth.middleware.ts
   export async function requireAuth(request: Request) {
     const userId = await getUserId(request);
     if (!userId) {
       throw redirect('/login');
     }
     return userId;
   }
   ```

3. **テストの追加**
   - 各ルートの認可テスト
   - 未認証時のリダイレクト確認