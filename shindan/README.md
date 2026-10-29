# 無料AI業務診断（/shindan）

moruko.groundmole.space/shindan で公開する無料AI業務診断フォームと、有料オンライン診断（60分・10,000円税込）への導線。
元は ~/workspace/free_diagnosis（Pages版）。ここは moruko-lp の Worker に統合した版。

## 構成
- `shindan/` 静的ファイル（index.html, thanks.html, app.js, questions.js, style.css, config.js）
- `shindan_api/` `/api/diagnose` の実装（worker.js から import）
  - handler.js 入口（Origin確認・本文16KB上限・honeypot・IPごと1時間5回の簡易制限・通知）
  - gemini.js / prompt.js / validate.js（プロンプトインジェクション対策、合計時間・金額はサーバー側計算）
  - notify.js 通知文の組み立て（送信は worker.js の notifyTelegram を再利用）
- `shindan_api/` と `shindan/README.md` と `shindan/shots/` は `.assetsignore` で静的配信から除外済み
- 回答の保存はしない（D1/KVなし）。IP・ブラウザ情報も保存しない

## 公開前に必要なこと（未実施）
1. `wrangler secret put GEMINI_API_KEY`（AI Studio発行のキー。モデルは既定 gemini-3.8-flash、変更は環境変数 GEMINI_MODEL）
2. 既存の TG_BOT_TOKEN / TG_CHAT_ID がそのまま通知に使われる。PREVIEW="1" の環境では通知しない
3. `wrangler deploy`（moruko-lp は git push だけでは反映されない場合あり。既存運用に従う）
4. レート制限はWorkerインスタンス内のメモリ。複数インスタンスでは合算されない。厳密にやるならCloudflareのRate Limitingルールを追加

## Stripe（本番アカウント・2026-10-29作成）
- 商品: AIオンライン業務診断（60分） `prod_VWs0IN30HavIvy`
- 価格: 10,000円（税込・一回払い） `price_1UVoGwIgbCdh16E5wTfI84Oe`
- 決済リンク: `plink_1UVoGwIgbCdh16E5VhlMwfgy`
  - https://buy.stripe.com/9B64gz9y72rP43E1mq3wQ0q
  - 電話番号を収集、カスタム欄「相談したいこと（任意）」、完了後 https://moruko.groundmole.space/shindan/thanks へ
  - 氏名はカード入力欄、メールは標準で収集
- URLは `shindan/config.js` の BOOKING_URL

## ローカル確認
`wrangler dev` は資産ディレクトリが "." のため、.git や .wrangler の変更で再読み込みが止まらなくなる。確認は public/ に静的ファイルを分けたコピーで行った。
`.dev.vars` に GEMINI_API_KEY と PREVIEW=1 を置く（gitignore済み、作業後に削除）。
