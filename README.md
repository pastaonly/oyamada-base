## おやまだいベース 会員アプリ

尾山台３丁目の「おやまだいベース」会員向けフロントエンド。

### 構成

- Next.js (App Router + TypeScript)
- Tailwind CSS v4
- Firebase Authentication / Firestore

### セットアップ

1. 依存パッケージをインストール  
   ```bash
   npm install
   ```

2. `.env.example` を参考に `.env.local` を作成し、Firebase プロジェクトの値を設定します。  
   `NEXT_PUBLIC_ADMIN_EMAIL` には管理者判定に利用するメールアドレスを指定してください。

3. `firebase` プロジェクトには、会員メールの事前登録用として `preRegisteredMembers` コレクションを用意し、ドキュメント ID にメールアドレスを設定してください（例：`test@example.com`）。

4. 開発サーバーを起動  
   ```bash
   npm run dev
   ```

5. ブラウザで [http://localhost:3000/login](http://localhost:3000/login) を開き、Google ログインボタンから認証を確認してください。正常にログインすると `/`（ホーム）へ遷移します。

### 実装済み (Step 1)

- Firebase クライアント初期化 (`src/lib/firebaseConfig.ts`)
- Google ログイン画面 (`/login`)
  - ロゴ表示「おやまだいベース」
  - Google ログインボタン
  - 事前登録が無いメールアドレスでログインした際の警告表示
  - 認証成功時は `/` に遷移
- 認証状態管理
  - `AuthProvider` でグローバルにログイン状態を監視
  - `ProtectedRoute` によりログイン済みユーザのみ `/` を閲覧可能
- Firestore 初期登録
  - ログイン時に `users/{uid}` ドキュメントを自動生成（存在しない場合）
  - `.env.local` の `NEXT_PUBLIC_ADMIN_EMAIL` と一致するメールアドレスに `isAdmin: true` を付与

### 備考

`npm run lint` で ESLint を実行できます。`functions/` ディレクトリ内の未使用コードについては Firebase Function 実装時に調整してください。

### Firestore セキュリティルール

`firestore.rules` では `preRegisteredMembers` コレクションの読み取りのみを認証済みユーザに許可しています。他のコレクションは後続ステップでルールを拡張してください。
