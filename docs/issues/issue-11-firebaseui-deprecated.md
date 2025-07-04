# Issue #11: 依存関係: firebaseuiの廃止に対応

**作成日**: 2025-07-03  
**優先度**: Medium  
**ラベル**: tech-debt, priority:medium

## 問題
firebaseuiは公式に廃止（deprecated）されている。

## リスク
- セキュリティアップデートが提供されない
- 将来的に動作しなくなる可能性
- 新機能のサポートなし

## 改善案
1. **Firebase Auth UIの代替実装**
   - Firebase SDK v9+の直接使用
   - カスタムUIコンポーネントの作成
   
2. **既存の代替ライブラリ**
   - react-firebaseui（コミュニティ版）
   - 自前のAuth UIコンポーネント

3. **移行計画**
   ```typescript
   // 新しい認証コンポーネント
   import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
   
   const SignInButton = () => {
     const handleGoogleSignIn = async () => {
       const provider = new GoogleAuthProvider();
       await signInWithPopup(auth, provider);
     };
   };
   ```