// 診断回数の上限（Durable Object）。Workerのメモリ上の制限はインスタンスごとにバラけるので、
// 1日の総数と同じ人（IP）の1日あたり回数はここで数える。
// 1日（日本時間）ごとに別インスタンス。IPはそのまま保存せず、日付つきのハッシュだけ保存する。
// インスタンスは2日後のアラームで中身を消す。
export const DAILY_TOTAL_LIMIT = 50; // 1日の診断総数（AI代の上限ガード）
export const DAILY_PER_IP_LIMIT = 5; // 同じIPから1日あたり

export class ShindanCounter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const { ipHash } = await request.json();
    const s = this.state.storage;
    const total = (await s.get("total")) || 0;
    const mine = (await s.get("ip:" + ipHash)) || 0;
    if (total === 0 && !(await s.getAlarm())) await s.setAlarm(Date.now() + 2 * 24 * 60 * 60 * 1000);
    if (total >= DAILY_TOTAL_LIMIT) {
      const first = !(await s.get("capNotified"));
      if (first) await s.put("capNotified", true);
      return Response.json({ ok: false, reason: "daily_total", notify: first });
    }
    if (mine >= DAILY_PER_IP_LIMIT) return Response.json({ ok: false, reason: "daily_ip" });
    await s.put({ total: total + 1, ["ip:" + ipHash]: mine + 1 });
    return Response.json({ ok: true, total: total + 1 });
  }

  async alarm() {
    await this.state.storage.deleteAll();
  }
}

const jstDate = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 戻り値 { ok, reason?, notify? }。バインディングが無い環境（ローカル等）では素通し。
export async function takeQuota(env, ip) {
  if (!env.SHINDAN_COUNTER) return { ok: true };
  const date = jstDate();
  const stub = env.SHINDAN_COUNTER.get(env.SHINDAN_COUNTER.idFromName("day:" + date));
  const ipHash = (await sha256(date + "|" + ip)).slice(0, 32);
  const res = await stub.fetch("https://counter/take", { method: "POST", body: JSON.stringify({ ipHash }) });
  return res.json();
}
