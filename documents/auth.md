# Google OAuth2 認証追加ガイド（SvelteKit × Cloudflare Workers 用）

> **目的**: 現行の SvelteKit on Workers アプリに「ユーザーの Google Drive へアクセスするための認証機能」だけを追加する。画像生成やバッチ処理は後回し。
>
> - **ゴール**: ユーザーがブラウザで「Google でログイン」→ アプリに戻る → セッション確立 → Drive API を呼べる準備完了
> - **対象**: 既に Hello World が `wrangler deploy` 済みの状態
> - **所要時間**: 20〜30 分（Google Cloud Console 設定含む）

---

## 0. 前提チェック

| 項目                                        | 確認方法                             | OK? |
| ----------------------------------------- | -------------------------------- | --- |
| **SvelteKit + adapter-cloudflare** が動いている | `<YOUR_DOMAIN>` に Hello World 表示 | ☐   |
| **wrangler.toml** が存在                     | `compatibility_date` 設定済み        | ☐   |
| Node 18+ / npm 9+                         | `node -v` / `npm -v`             | ☐   |

---

## 1. Google Cloud Console での準備

1. **新規プロジェクト**（既存でも可）
2. **OAuth 同意画面**: 外部 > テストユーザーに自分の Gmail を追加
3. **OAuth 2.0 クライアント ID** → アプリ種別「Web」
   - **承認済み生成元**
     - `https://<YOUR_DOMAIN>`
     - `http://localhost:5173` (Vite dev)
     - `http://localhost:8787` (wrangler dev)
   - **承認済みリダイレクト URI**
     - `https://<YOUR_DOMAIN>/auth/google/callback`
     - `http://localhost:5173/auth/google/callback`
     - `http://localhost:8787/auth/google/callback`
4. **Drive API** を有効化
5. **取得情報**
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

> **ポイント**: 画像書き込みも行う予定なのでスコープは後で `drive.file` を要求するが、今は設定不要。

---

## 2. Cloudflare 側の環境変数

### 2.1 wrangler.toml に追加

```toml
[vars]
GOOGLE_CLIENT_ID     = "xxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "xxxxxxxx"
SESSION_SECRET       = "32-byte-random-string"
```

### 2.2 dev 用 .env

```env
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

---

## 3. パッケージ導入

```bash
npm i simple-oauth2 @types/simple-oauth2 jsonwebtoken
```

- **simple-oauth2**: サーバ側 Code Flow を簡単に実装
- **jsonwebtoken**: セッション Cookie を JWT 化（任意）

---

## 4. ルーティング設計（最低 3 ルート）

| パス                      | 役割           | 実装ファイル                                       | 備考                             |
| ----------------------- | ------------ | -------------------------------------------- | ------------------------------ |
| `/auth/google`          | 認可リクエスト開始    | `src/routes/auth/google/+server.ts`          | Google へ 302 リダイレクト            |
| `/auth/google/callback` | 認可コード→トークン交換 | `src/routes/auth/google/callback/+server.ts` | refresh\_token を KV 保存、セッション発行 |
| `/api/me`               | ログイン状態確認     | `src/routes/api/me/+server.ts`               | `sid` JWT を検証して email 等返却      |

> **UI** 側はログインボタンを置いて `/auth/google` にリンクするだけで OK。

---

## 5. Token ストレージ方針

| 要素                                                           | 保管場所                              | 理由                                    |
| ------------------------------------------------------------ | --------------------------------- | ------------------------------------- |
| `access_token`, `refresh_token`, `expires_in`, `obtained_at` | **KV Namespace** (例: `TOKENS_KV`) | キー `g:<Google sub>` で一意。KV は読込速く課金も安い |
| セッション (JWT)                                                  | HttpOnly Cookie `sid`             | ブラウザ保存。30d 有効                         |

> refresh\_token は **必ず暗号化** または Workers Secret を合成して保存する。簡易例では平文＋ KV でも可。

---

## 6. 署名鍵 & Cookie 設定

| 設定       | 値                                        | 備考                                                      |
| -------- | ---------------------------------------- | ------------------------------------------------------- |
| Cookie 名 | `sid`                                    | -                                                       |
| 属性       | `HttpOnly; Secure; SameSite=Lax; Path=/` | クロスサイト脅威対策                                              |
| 署名鍵      | `SESSION_SECRET`                         | `jsonwebtoken.sign(payload, secret, {expiresIn:'30d'})` |

---

## 7. ローカル開発

1. **Vite dev**: `npm run dev` ([http://localhost:5173](http://localhost:5173))
2. **Workers runtime**: `npx wrangler dev` ([http://localhost:8787](http://localhost:8787))
   - この URL も Google 生成元 & リダイレクトに入っているか確認
3. ブラウザで「Google でログイン」→ 同意画面 → トップへ戻る → `/api/me` が email を返せば成功

---

## 8. デプロイ手順

```bash
wrangler deploy
```

- 切り替え直後は `https://<YOUR_DOMAIN>/auth/google` でテスト
- Production URL が **承認済み生成元** に入っていない場合 400 エラーになるので要確認

---

## 9. 次のステップ

| フェーズ       | 追加作業                                                    | 参考                        |
| ---------- | ------------------------------------------------------- | ------------------------- |
| Drive 読み取り | 1) スコープを `drive.readonly` に変更  2) `/api/drive/list` を実装 | `googleapis` lib or fetch |
| Drive 書き込み | スコープを `drive.file` に変更し `uploadType=multipart` で POST   | メタデータ＋バイナリを境界線付きで送信       |
| バッチ処理      | Queue + D1 + Consumer Worker を導入                        | 別ガイド参照                    |

---

### まとめ

- **このガイドが完了すると:**
  - Google アカウントでログイン → `sid` Cookie が得られる
  - Worker が `access_token / refresh_token` を安全に取り出せる
- **追加機能**（Drive API 呼び出し、画像生成）はこの土台の上に実装するだけ。

> 不明点があれば随時このドキュメントをアップデートする形でメモしていくと管理が楽です。

