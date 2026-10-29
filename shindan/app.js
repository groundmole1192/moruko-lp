import { QUESTIONS, OTHER_MAX } from "./questions.js";
import { BOOKING_URL } from "./config.js";

const $ = (id) => document.getElementById(id);
const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>';

const state = { step: 0, answers: {}, email: "" };
const screens = ["intro", "question", "finish", "loading", "result", "failed"];

function show(name) {
  for (const s of screens) $(s).hidden = s !== name;
  const inForm = name === "question" || name === "finish";
  document.querySelector(".progress").hidden = !inForm;
  const done = name === "finish" ? QUESTIONS.length : state.step;
  document.querySelector(".progress-bar").style.width = `${(done / QUESTIONS.length) * 100}%`;
  window.scrollTo({ top: 0 });
}

function el(tag, attrs = {}, text) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  if (text != null) e.textContent = text;
  return e;
}

function optionList(name, options, type, selected, onChange) {
  const box = el("div", { class: "opts", role: type === "single" ? "radiogroup" : "group" });
  for (const opt of options) {
    const isOn = type === "single" ? selected === opt : (selected || []).includes(opt);
    const label = el("label", { class: `opt ${type === "multi" ? "multi" : ""} ${isOn ? "on" : ""}` });
    const input = el("input", { type: type === "single" ? "radio" : "checkbox", name, value: opt });
    input.checked = isOn;
    const mark = el("span", { class: "mark" });
    mark.innerHTML = CHECK; // 固定のSVGのみ
    label.append(input, mark, el("span", {}, opt));
    input.addEventListener("change", () => onChange(opt, input.checked));
    box.append(label);
  }
  return box;
}

function textArea(id, q, value, onInput) {
  const wrap = el("div");
  const ta = el("textarea", { class: "input", id, maxlength: String(q.maxLength), placeholder: q.placeholder || "" });
  ta.value = value || "";
  const counter = el("div", { class: "counter" }, `${ta.value.length} / ${q.maxLength}`);
  ta.addEventListener("input", () => {
    counter.textContent = `${ta.value.length} / ${q.maxLength}`;
    onInput(ta.value);
  });
  wrap.append(ta, counter);
  return wrap;
}

function renderQuestion() {
  const q = QUESTIONS[state.step];
  $("step-count").textContent = `${state.step + 1} / ${QUESTIONS.length}`;
  $("q-title").textContent = q.title;
  $("q-hint").textContent = q.hint || (q.type === "single" ? "1つ選んでください。" : "");
  $("q-hint").hidden = !$("q-hint").textContent;
  $("q-error").hidden = true;
  const body = $("q-body");
  body.replaceChildren();

  const rerender = () => renderQuestion();

  if (q.type === "text") {
    body.append(textArea(`t-${q.id}`, q, state.answers[q.id], (v) => (state.answers[q.id] = v)));
  } else {
    const list = optionList(q.id, q.options, q.type, state.answers[q.id], (opt, checked) => {
      if (q.type === "single") {
        state.answers[q.id] = opt;
      } else {
        let arr = state.answers[q.id] || [];
        if (checked) {
          arr = q.exclusive && opt === q.exclusive ? [opt] : [...arr.filter((x) => x !== q.exclusive), opt];
        } else {
          arr = arr.filter((x) => x !== opt);
        }
        state.answers[q.id] = arr;
      }
      rerender();
    });
    body.append(list);

    const chosenOther = q.other && (q.type === "single" ? state.answers[q.id] === "その他" : (state.answers[q.id] || []).includes("その他"));
    if (chosenOther) {
      const w = el("div", { class: "other-wrap" });
      const inp = el("input", { class: "input", type: "text", maxlength: String(OTHER_MAX), placeholder: "その他の内容（短くで大丈夫です）" });
      inp.value = state.answers[q.id + "_other"] || "";
      inp.addEventListener("input", () => (state.answers[q.id + "_other"] = inp.value));
      w.append(inp);
      body.append(w);
    }

    if (q.followup) {
      const sel = state.answers[q.id] || [];
      const noOutsourcing = sel.length === 1 && sel[0] === q.exclusive;
      if (sel.length > 0 && !noOutsourcing) {
        const f = el("div", { class: "followup" });
        f.append(el("h3", {}, q.followup.title));
        f.append(
          optionList(q.followup.id, q.followup.options, "single", state.answers[q.followup.id], (opt) => {
            state.answers[q.followup.id] = opt;
            rerender();
          })
        );
        body.append(f);
      } else if (noOutsourcing) {
        state.answers[q.followup.id] = "払っていない";
      }
    }
  }
  $("back").textContent = state.step === 0 ? "最初へ" : "戻る";
  $("next").textContent = state.step === QUESTIONS.length - 1 ? "次へ（最後）" : "次へ";
}

function currentValid() {
  const q = QUESTIONS[state.step];
  const v = state.answers[q.id];
  if (!q.required) return true;
  if (q.type === "single") return !!v;
  if (q.type === "multi") return Array.isArray(v) && v.length > 0;
  return typeof v === "string" && v.trim().length > 0;
}

$("start").addEventListener("click", () => {
  state.step = 0;
  renderQuestion();
  show("question");
});

$("next").addEventListener("click", () => {
  if (!currentValid()) {
    const q = QUESTIONS[state.step];
    $("q-error").textContent = q.type === "text" ? "ひとことでいいので書いてください。" : "1つ以上選んでください。";
    $("q-error").hidden = false;
    return;
  }
  if (state.step < QUESTIONS.length - 1) {
    state.step++;
    renderQuestion();
    show("question");
  } else {
    show("finish");
  }
});

$("back").addEventListener("click", () => {
  if (state.step === 0) return show("intro");
  state.step--;
  renderQuestion();
  show("question");
});

$("back2").addEventListener("click", () => {
  state.step = QUESTIONS.length - 1;
  renderQuestion();
  show("question");
});

async function submit() {
  const email = $("email").value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    $("f-error").textContent = "メールアドレスの形をご確認ください（空欄でも大丈夫です）。";
    $("f-error").hidden = false;
    return;
  }
  $("f-error").hidden = true;
  state.email = email;
  show("loading");
  try {
    const res = await fetch("/api/diagnose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: state.answers, email, website: $("website").value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    renderResult(data.result);
    show("result");
  } catch (e) {
    console.error(e);
    show("failed");
  }
}

const yenFmt = (n) => Number(n).toLocaleString("ja-JP");
const range = (a, b, unit) => (a === b ? `${yenFmt(a)}${unit}` : `${yenFmt(a)}〜${yenFmt(b)}${unit}`);

function stars(n) {
  const wrap = el("span", { class: "stars", "aria-label": `難しさ ${n} / 3` });
  for (let k = 1; k <= 3; k++) wrap.append(el("span", { class: k <= n ? "star on" : "star", "aria-hidden": "true" }, "★"));
  return wrap;
}

const DIFF_WORD = { 1: "やさしい", 2: "ふつう", 3: "手間がかかる" };

function renderTask(t, i) {
  const li = el("li", { class: "task" });
  const head = el("div", { class: "task-head" });
  head.append(el("span", { class: "task-num" }, String(i + 1)), el("h3", {}, t.title));

  const dl = el("dl");
  dl.append(el("dt", {}, "今の手間"), el("dd", {}, t.what), el("dt", {}, "AIがどう手伝うか"), el("dd", {}, t.how));

  const hours = el("div", { class: "hours" });
  const p = el("p", { class: "hours-line" });
  p.append(el("span", { class: "mini-label" }, "減りそうな時間"), el("strong", {}, t.hours));
  hours.append(p, el("p", { class: "basis" }, t.basis));

  // 難しさ・道具（並べて一目で）
  const meta = el("div", { class: "meta" });
  const diff = el("div", { class: "meta-item" });
  const diffTop = el("p", { class: "meta-top" });
  diffTop.append(el("span", { class: "mini-label" }, "難しさ"), stars(t.difficulty), el("span", { class: "meta-word" }, DIFF_WORD[t.difficulty] || ""));
  diff.append(diffTop, el("p", { class: "meta-text" }, t.difficulty_reason));
  const tools = el("div", { class: "meta-item" });
  const toolsTop = el("p", { class: "meta-top" });
  toolsTop.append(el("span", { class: "mini-label" }, "必要な道具"), el("span", { class: "tag" }, t.tools_level));
  tools.append(toolsTop, el("p", { class: "meta-text" }, t.tools));
  meta.append(diff, tools);

  // 最初の3ステップ（長くなるので折りたたみ）
  const det = el("details", { class: "steps" });
  det.append(el("summary", {}, "自分でやるなら、最初の3ステップ"));
  const ol = el("ol");
  for (const s of t.steps || []) ol.append(el("li", {}, s));
  det.append(ol);

  const caut = el("div", { class: "caution" });
  caut.append(el("p", { class: "mini-label" }, "注意点"), el("p", {}, t.cautions));

  li.append(head, dl, hours, meta, det, caut);
  return li;
}

// ---- グラフ（インラインSVG・外部ライブラリなし） ----
const NS = "http://www.w3.org/2000/svg";
function svg(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text != null) e.textContent = text;
  return e;
}

const RADAR_AXES = [
  { key: "marketing", lines: ["発信・集客"], anchor: "middle" },
  { key: "customer", lines: ["予約・", "お客さん対応"], anchor: "start" },
  { key: "admin", lines: ["事務・", "お金まわり"], anchor: "start" },
  { key: "research", lines: ["調べもの・", "情報整理"], anchor: "end" },
  { key: "content", lines: ["資料・", "制作物"], anchor: "end" },
];

function renderRadar(pot) {
  const W = 340, H = 290, cx = 170, cy = 148, R = 82;
  const pt = (i, r) => {
    const a = ((i * 72 - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = (r) => RADAR_AXES.map((_, i) => pt(i, r).map((n) => n.toFixed(1)).join(",")).join(" ");
  const vals = RADAR_AXES.map((ax) => Math.min(5, Math.max(1, Math.round(Number(pot?.[ax.key]) || 1))));
  const desc = RADAR_AXES.map((ax, i) => `${ax.lines.join("")}${vals[i]}`).join("、");
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart-svg", role: "img", "aria-label": `AIに任せられる伸びしろ（5段階）：${desc}` });
  for (let l = 1; l <= 5; l++) s.append(svg("polygon", { points: poly((R * l) / 5), class: l === 5 ? "rd-ring rd-outer" : "rd-ring" }));
  RADAR_AXES.forEach((_, i) => {
    const [x, y] = pt(i, R);
    s.append(svg("line", { x1: cx, y1: cy, x2: x.toFixed(1), y2: y.toFixed(1), class: "rd-axis" }));
  });
  s.append(svg("polygon", { points: RADAR_AXES.map((_, i) => pt(i, (R * vals[i]) / 5).map((n) => n.toFixed(1)).join(",")).join(" "), class: "rd-area" }));
  RADAR_AXES.forEach((_, i) => {
    const [x, y] = pt(i, (R * vals[i]) / 5);
    s.append(svg("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 3.5, class: "rd-dot" }));
  });
  RADAR_AXES.forEach((ax, i) => {
    const [x0, y0] = pt(i, R + 14);
    const dx = ax.anchor === "start" ? 2 : ax.anchor === "end" ? -2 : 0;
    const top = i === 0 ? y0 - 8 : y0 - (ax.lines.length - 1) * 8 + (i >= 2 && i <= 3 ? 8 : 0);
    const t = svg("text", { x: (x0 + dx).toFixed(1), y: top.toFixed(1), "text-anchor": ax.anchor, class: "rd-label" });
    ax.lines.forEach((ln, k) => t.append(svg("tspan", { x: (x0 + dx).toFixed(1), dy: k === 0 ? 0 : 16 }, ln)));
    s.append(t);
  });
  return s;
}

function renderBars(tasks) {
  const W = 340, rowH = 58, H = tasks.length * rowH + 8;
  const barX = 0, barW = 236, textX = 246;
  const maxH = Math.max(1, ...tasks.map((t) => t.hours_max));
  const desc = tasks.map((t, i) => `${i + 1}つ目 ${t.title}、月${t.hours_min === t.hours_max ? t.hours_min : `${t.hours_min}〜${t.hours_max}`}時間`).join("。");
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart-svg", role: "img", "aria-label": `作業ごとの減りそうな時間（月、推定）。${desc}` });
  tasks.forEach((t, i) => {
    const y = i * rowH;
    const title = t.title.length > 21 ? t.title.slice(0, 20) + "…" : t.title;
    s.append(svg("text", { x: 0, y: y + 18, class: "bar-title" }, `${i + 1}  ${title}`));
    s.append(svg("rect", { x: barX, y: y + 28, width: barW, height: 16, rx: 3, class: "bar-track" }));
    const wMax = Math.max(4, (barW * t.hours_max) / maxH);
    const wMin = Math.max(4, (barW * t.hours_min) / maxH);
    s.append(svg("rect", { x: barX, y: y + 28, width: wMax.toFixed(1), height: 16, rx: 3, class: "bar-max" }));
    s.append(svg("rect", { x: barX, y: y + 28, width: wMin.toFixed(1), height: 16, rx: 3, class: "bar-min" }));
    const label = t.hours_min === t.hours_max ? `${t.hours_min}時間` : `${t.hours_min}〜${t.hours_max}時間`;
    s.append(svg("text", { x: textX, y: y + 41, class: "bar-val" }, label));
  });
  return s;
}

function renderCharts(r) {
  $("r-bars").replaceChildren(renderBars(r.tasks));
  const hasPot = r.potential && typeof r.potential === "object";
  $("r-radar-card").hidden = !hasPot;
  if (hasPot) {
    $("r-radar").replaceChildren(renderRadar(r.potential));
    $("r-radar-note").textContent = r.potential_note || "";
    $("r-radar-note").hidden = !r.potential_note;
  }
}

function renderResult(r) {
  $("r-summary").textContent = r.summary;
  const tot = r.total;
  $("r-total-hours").textContent = `${range(tot.hours_min, tot.hours_max, "時間")}ほど`;
  $("r-total-yen").textContent = `${range(tot.yen_min, tot.yen_max, "円")}ほど`;
  $("r-total-calc").textContent = `時給${yenFmt(tot.hourly_wage)}円 × 減る時間で計算した目安です（1,000円単位）。`;
  $("r-total-basis").textContent = tot.wage_basis ? `時給の決め方：${tot.wage_basis}` : "";
  $("r-total-basis").hidden = !tot.wage_basis;

  renderCharts(r);

  const list = $("r-tasks");
  list.replaceChildren();
  r.tasks.forEach((t, i) => list.append(renderTask(t, i)));

  $("r-keep-title").textContent = r.keep_for_human.title;
  $("r-keep-why").textContent = r.keep_for_human.why;
  $("r-next").textContent = r.next_step;
  $("offer-mail").hidden = !state.email;
  if (BOOKING_URL) {
    $("offer-link").href = BOOKING_URL;
    $("offer-link").hidden = false;
  }
}

$("submit").addEventListener("click", submit);
$("retry").addEventListener("click", submit);
$("restart").addEventListener("click", () => {
  state.step = 0;
  state.answers = {};
  state.email = "";
  $("email").value = "";
  show("intro");
});

show("intro");
