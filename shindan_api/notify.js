// 診断が1件完了するたびに、北さんのTelegramへ要約を送る。メールアドレスの有無は書くが、本体は送らない
// （連絡先は「入力があった場合のみ」要約に載せる。北さん本人宛の通知なので可）。
const clip = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function buildNotifyText(answers, result, email) {
  const a = answers || {};
  const r = result || {};
  const tot = r.total || {};
  const pot = r.potential || {};
  const names = { marketing: "発信", customer: "お客さん", admin: "事務", research: "調べもの", content: "制作物" };
  const radar = Object.keys(names).map((k) => `${names[k]}${pot[k] ?? "-"}`).join(" / ");
  const tasks = (r.tasks || []).slice(0, 3).map((t, i) => `${i + 1}. ${clip(t.title, 40)}（月${t.hours_min}〜${t.hours_max}時間）`);
  return [
    "無料AI業務診断が1件完了しました",
    "",
    `業種: ${a.industry || "-"}${a.industry_other ? `（${clip(a.industry_other, 40)}）` : ""}`,
    `人数: ${a.staff || "-"}`,
    "",
    "任せられること:",
    ...tasks,
    "",
    `合計: 月${tot.hours_min ?? "-"}〜${tot.hours_max ?? "-"}時間（推定）`,
    `伸びしろ: ${radar}`,
    `連絡先: ${email ? email : "なし"}`,
  ].join("\n");
}
