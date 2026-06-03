---
version: alpha
name: moruko-lp
description: "作れるAI秘書。相談すると制作・記録・更新まで動く"
colors:
  primary: "#FF8A00"
  secondary: "#FFF1E0"
  tertiary: "#333333"
  neutral: "#666666"
  surface: "#FAFAFB"
  on-surface: "#FFFFFF"
typography:
  h1:
    fontFamily: Noto Sans JP
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  h2:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
---
## Overview

moruko-lp は **作れるAI秘書。相談すると制作・記録・更新まで動く** を体現する 個人事業主、フリーランス、スモールチーム に向けた **clean, warm, trustworthy, slightly playful** なデザインシステム。

## Colors

- **Primary (#FF8A00):** 主要なテキスト・見出しに使用
- **Secondary (#FFF1E0):** ボーダー・キャプション・メタデータに使用
- **Tertiary (#333333):** インタラクション要素の強調・CTAに使用
- **Neutral (#666666):** ページのベース背景色
- **Surface (#FAFAFB):** コンテンツカードの背景色
- **On-Surface (#FFFFFF):** サーフェス上のテキスト色

## Typography

タイポグラフィは **Noto Sans JP, Outfit** を使用。

- **見出し:** Noto Sans JP 600weight、48px でインパクトを与える。

## Layout & Spacing

8pxベースのスペーシングスケールでレイアウトの一貫性を維持。
最大幅は 1200px、モバイルファーストでレスポンシブ対応。

## Components

プライマリーボタンは **#333333** を背景に、白または `on-surface` 色のテキスト。
ボタンは `rounded.md`（8px）のコーナー丸めで親しみやすさを演出。

## Do's and Don'ts

- プライマリーカラー（#FF8A00）は画面内で最も重要な要素にのみ使用
- 同一画面で2つ以上のフォントウェイトを混在させない
- WCAG AA コントラスト比（通常テキスト 4.5:1）を維持
- 角丸は同一ビュー内で統一する
