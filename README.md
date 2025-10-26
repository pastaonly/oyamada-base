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

### 実装済み (Step 2)

- 週間利用予定カレンダー (`src/app/(protected)/page.tsx`)
  - 縦軸：時間帯（午前／午後1〈13:00-16:00〉／午後2〈16:00-19:00〉／夜）
  - 横軸：曜日（月〜日）
  - 部屋タブ：手前の部屋・奥の部屋・リビング（優先部屋設定がある場合は表示順を調整）
- 予約トグル：自分の予約は「○」、リビングは他会員が入ると灰色表示で操作不可
  - 手前・奥の部屋は複数人予約可能（人数が表示され、他会員と重複して予約可能）
  - 予約者の表示はプロフィール画像を使用（未設定の場合は名前の頭文字を表示）
  - 予約者アイコンをクリックするとコメントを閲覧／編集（本人のみ編集・削除可）
  - 週送り：前週・次週ボタンで切り替え
- Firestore 連携
  - 予約データは `reservations` コレクションに `YYYY-MM-DD_space_slot[_uid]` 形式で保存（手前/奥は `uid` 付き）
  - 週次で自動購読し、リアルタイムに UI へ反映
- プロフィール
  - 画面右上にログイン中ユーザのメールアドレスとプロフィール画像を表示
  - `画像変更` ボタンから画像をアップロード（Firebase Storage）し、`users/{uid}` と予約履歴に反映

### データモデル補足

- `users/{uid}` ドキュメントには `preferredRoom`（`front` / `back` / `living` / null）を想定
- `preRegisteredMembers/{email}` が存在するメールアドレスのみログイン可能
- `reservations/{id}` ドキュメント例
  ```json
  {
    "date": "2024-08-18",
    "space": "front",
    "timeSlot": "morning",
    "userId": "UID",
    "userName": "表示名",
    "userAvatarUrl": "https://...",
    "createdAt": <serverTimestamp>
  }
  ```

### 備考

`npm run lint` で ESLint を実行できます。`functions/` ディレクトリ内の未使用コードについては Firebase Function 実装時に調整してください。

### Firestore セキュリティルール

`firestore.rules` では以下を許可しています。
- `preRegisteredMembers`: 読み取りのみ（管理者が別途メンテナンス）
- `users/{uid}`: 当人のみ読み書き可能
- `reservations/{id}`: 全員が閲覧可能、自分の予約のみ作成・更新・削除可能

### Storage ルール

プロフィール画像アップロード用に `storage.rules` を追加しています。Firebase コンソールで Storage を有効化したうえで、以下のルールをデプロイしてください。

```bash
firebase deploy --only storage
```
