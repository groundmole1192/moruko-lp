---
version: 1.0
name: moruko-lp
description: "moruko を『働くAI秘書』として見せる、没入型の紹介ページ"
colors:
  primary: "#F4F1FA"
  secondary: "#B3A9C8"
  tertiary: "#8A7BFF"
  neutral: "#14101C"
  surface: "#201A2E"
typography:
  h1:
    fontFamily: Noto Sans JP
    fontSize: 54px
    fontWeight: 800
    lineHeight: 1.16
    letterSpacing: -0.03em
  h2:
    fontFamily: Noto Sans JP
    fontSize: 44px
    fontWeight: 800
    lineHeight: 1.16
    letterSpacing: -0.02em
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.75
rounded:
  sm: 8px
  md: 16px
  lg: 22px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
---
## Overview

moruko-lp は、AI秘書 moruko を「便利なツール」ではなく「働くチームメンバー」として見せるための紹介ページ。
ターゲットは、北さんの既存顧客、紹介先、業務効率化に関心のある小規模事業者。
トーンは **cinematic / premium / slightly playful / trustworthy**。

このページの目的は、説明を読む前に「動き」で印象づけ、スクロール後半で実績と導入導線に自然着地させること。

## 構成（index.html）

1. **Scroll World（ヒーロー）:** `scroll-world.js` + `style-v3.css` によるスクロール連動の没入パート。3シーン（はじまり / しごと / あんしん）。ワールドを抜けた後はコピー・ルートドットがフェードアウトし、固定トップバー（ブランド + グローバルリンク + CTA）だけが残る。
2. **できること:** 6機能カード（実画像は `morukoimage/feat_*.webp`）。
3. **CM動画:** YouTube埋め込み（1分でわかるCM動画）。
4. **利用者の声:** 実ユーザー3名の引用とタグ。
5. **料金:** 買い切りプラン ¥240,000（税込）。ストーリー（人を雇う/Mac mini比較）+ プランカード + 注記（モニター不要で-¥15,000、AIサブスク別途）。
6. **サポート:** 3つの安心（すぐ使える/レクチャー/プライバシー）。
7. **導入の流れ:** 4ステップ + 事前準備の詳細。
8. **コミュニティ:** moruコミュニティへの導線。
9. **最終CTA + フッター:** LINE無料相談を主CTAに、特商法・プライバシー・問い合わせリンク。

## Colors

- **primary (`#F4F1FA`):** 主要テキスト、見出し
- **secondary (`#B3A9C8`):** 補助テキスト、タグ、注釈
- **tertiary (`#8A7BFF`):** CTA、アクティブ状態、演出の主役色（+ `#4F8CFF` とのグラデ）
- **neutral (`#14101C`):** 背景、空気感
- **surface (`#201A2E`):** カード、パネル

配色ルール:
- 背景はダークファースト
- CTA は tertiary を主軸に、1画面1主CTAを守る
- 強調バッジ（正式サービス開始など）はゴールド系 `#FFB84F`

## Typography

- 見出しは Noto Sans JP を中心に、太めのウェイトで「AI社員感」を出す
- 数字や実績は Inter で締めて、視認性と信頼性を優先する
- 文章は短く、1文は長くしすぎない
- ヒーローコピーは `\n` で改行し、1行がコピー幅（max 660px）に収まる長さにする

## Layout

- 画面は「スクロールで飛ぶヒーロー」から始める
- 固定トップバー、右側のセクションドット（ワールド内のみ）で進行感を出す
- 最大幅は 1180px 前後、だがヒーローはフルブリードで見せる
- モバイルは 1カラム中心、固定UIは減らして読みやすさを優先する

## Elevation

- 浮遊感は薄い影と半透明グラスで作る
- 強い影は CTA と重要カードのみに限定する
- 画面奥行きは、背景グラデーション、薄い粒子、前景カードの3層で構成する

## Shapes

- ベースの角丸は `rounded.md` (16px) / `rounded.lg` (22px) を中心に統一する
- CTA とタグは pill 形状を使う
- セクション区切りは直線的すぎず、余白で切る

## Components

- **Hero Scene:** `scroll-world.js` によるスクロール連動。`contain: true` でマスコット画像を contain 表示できる
- **Fixed Topbar:** ブランド + グローバルリンク（できること/料金/導入の流れ）+ LINE相談CTA
- **Feature Cards:** 画像 + 見出し + 短文。hover で画像がわずかにズーム
- **Plan Card:** 価格を主役に、包含物をチェックリストで
- **Flow Steps:** 4ステップを横並び、モバイルは縦積み
- **LINE CTA:** 相談導線。最終CTAは「LINEで無料相談する」を基本に固定

## Motion

- スクロールに合わせて動く「カメラフライト」感を使う
- コピーはフェードと微小な上下移動（`--sw-drift`）で切り替える
- 各セクションは IntersectionObserver による `.reveal` フェードイン
- `prefers-reduced-motion` では動画・粒子・reveal を抑え、静的表示にフォールバックする

## Assets / Performance

- 配信ページでは最適化した `morukoimage/*.webp` を使う（元PNGは約20MB、webp合計約0.9MB）
- 元PNGは nagano.html / special.html / legal.html が参照するため保持
- 新規画像は ffmpeg で `scale=幅:-1 -quality 78〜86` の webp に変換する

## Content Rules

- 1スクリーンごとに伝えることは1つに絞る
- 数字実績は必ず「何の成果か」を添え、出所の確認できない数字は掲載しない
- 抽象語だけで終わらせず、導入後の変化を短文で入れる
- CTA は「LINEで無料相談する」を基本に固定する（購入導線は申し込みフォーム）

## Do's and Don'ts

- Do: 冒頭で「働くAI秘書」という世界観を強く見せる
- Do: モバイルで重すぎる演出を避ける
- Do: 最後は相談への着地を明快にする
- Don't: 説明文を長くしすぎない
- Don't: 色を増やしすぎない
- Don't: アニメーションを目的化しない
- Don't: 1画面に複数の主役CTAを置かない
