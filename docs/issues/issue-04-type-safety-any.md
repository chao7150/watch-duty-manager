# Issue #4: 型安全性: any型の使用を排除

**作成日**: 2025-07-03  
**優先度**: High  
**ラベル**: bug, tech-debt, priority:high

## 問題
3箇所でany型が使用されており、型安全性が損なわれている。

## 該当箇所
1. `app/routes/my._index.tsx` - line 224: イベントハンドラー
2. `app/domain/cour/util.ts` - line 16: 型ガード関数
3. `app/components/StylesFirebaseAuth.tsx` - line 16, 59: Firebase UI

## 改善案
1. イベントハンドラーには適切なReactイベント型を使用
2. 型ガード関数はunknown型を使用
3. Firebase UIの型定義を追加または@ts-ignoreで部分的に対処

```typescript
// Example: イベントハンドラーの改善
// Before
const handleChange = (e: any) => {...}

// After
const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {...}
```