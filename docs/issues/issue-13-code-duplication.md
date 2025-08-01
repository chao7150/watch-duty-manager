# Issue #13: コード重複: フォーム処理パターンの共通化

**作成日**: 2025-07-03  
**優先度**: Low  
**ラベル**: enhancement, tech-debt, priority:low

## 問題
フォーム処理のパターンが複数箇所で重複している。

## 該当箇所
- `components/watch-settings-edit-form/action.server.ts`
- `components/work-edit-form/action.server.ts`
- `components/work-create-form/action.server.ts`

## 改善案
1. **共通フォーム処理ユーティリティ**
   ```typescript
   // app/utils/form.ts
   export function createFormHandler<T>(
     validator: (data: FormData) => Either<Error, T>,
     handler: (data: T, userId: string) => Promise<void>
   ) {
     return async (request: Request) => {
       const userId = await requireUserId(request);
       const formData = await request.formData();
       
       return F.pipe(
         formData,
         validator,
         E.fold(
           (error) => ({ error: error.message }),
           async (data) => {
             await handler(data, userId);
             return { success: true };
           }
         )
       );
     };
   }
   ```

2. **バリデーションの共通化**
   - zodやyupの導入検討
   - 型安全なバリデーション

3. **エラーメッセージの統一**
