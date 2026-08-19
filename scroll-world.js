function mountScrollWorld(container, config) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const smallMQ = window.matchMedia('(max-width: 860px)');
  const isMobile = () => coarse || smallMQ.matches;
  const sections = config.sections || [];
  const connectors = config.connectors || [];
  const connectorsMobile = config.connectorsMobile || [];
  const DIVE_W = config.diveScroll || 1.35;
  const CONN_W = config.connScroll || 0.95;
  const CROSSFADE = config.crossfade ?? 0.12;
  const N = sections.length;
  if (!N) return;

  injectCSS();
  container.classList.add('sw-root');

  const sky = el('div', 'sw-sky');
  sky.appendChild(el('div', 'sw-sky__grad'));
  sky.appendChild(el('div', 'sw-sky__glow'));
  const particles = el('div', 'sw-particles');
  sky.appendChild(particles);

  const scrollbar = el('div', 'sw-scrollbar');
  const scrollbarFill = el('span');
  scrollbar.appendChild(scrollbarFill);

  const topbar = el('div', 'sw-topbar');
  const brand = el('a', 'sw-brand');
  brand.href = config.brand?.href || '#';
  brand.innerHTML = '<span class="sw-brand__mark"></span><span class="sw-brand__name">' + (config.brand?.name || 'moruko') + '</span>';
  topbar.appendChild(brand);

  const nav = el('nav', 'sw-nav');
  if (config.nav !== false) topbar.appendChild(nav);

  if (config.links?.length) {
    const links = el('div', 'sw-links');
    config.links.forEach(l => {
      const a = el('a', 'sw-links__item');
      a.href = l.href || '#';
      a.textContent = l.label || '';
      links.appendChild(a);
    });
    topbar.appendChild(links);
  }

  if (config.cta?.label) {
    const topCta = el('a', 'sw-topcta');
    topCta.href = config.cta.href || '#';
    topCta.textContent = config.cta.label;
    topbar.appendChild(topCta);
  }

  const stage = el('div', 'sw-stage');
  const copylayer = el('div', 'sw-copylayer');
  const route = el('div', 'sw-route');
  const hint = el('div', 'sw-hint');
  const hintText = el('span');
  hintText.textContent = config.hint || 'scroll';
  hint.appendChild(hintText);
  hint.appendChild(el('i'));
  const track = el('div', 'sw-track');

  [sky, scrollbar, topbar, stage, copylayer, route, hint, track].forEach(n => container.appendChild(n));

  const SEGMENTS = [];
  sections.forEach((section, index) => {
    const dive = {
      kind: 'dive',
      si: index,
      still: section.still,
      stillM: section.stillMobile,
      contain: section.contain,
      clip: section.clip,
      clipM: section.clipMobile,
      accent: section.accent,
      w: section.scroll || DIVE_W,
      linger: section.linger || 0,
    };
    SEGMENTS.push(dive);
    section._seg = dive;
    if (index < N - 1 && (connectors[index] || connectorsMobile[index])) {
      SEGMENTS.push({
        kind: 'conn',
        si: index,
        still: sections[index + 1].still,
        stillM: sections[index + 1].stillMobile,
        contain: sections[index + 1].contain,
        clip: connectors[index],
        clipM: connectorsMobile[index],
        accent: sections[index + 1].accent,
        w: CONN_W,
      });
    }
  });

  const copies = [];
  const dots = [];

  SEGMENTS.forEach(s => {
    const scene = el('div', 'sw-scene');
    scene.style.setProperty('--sw-accent', s.accent || '');
    if (s.contain) scene.classList.add('sw-scene--contain');
    const img = el('img', 'sw-scene__still');
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.src = (isMobile() && s.stillM) ? s.stillM : s.still;
    scene.appendChild(img);
    stage.appendChild(scene);
    s.el = scene;
    s.img = img;
    s.video = null;
    s.hasClip = false;
    s.loading = false;
    s.ready = false;
    s.cur = 0;
    s.target = 0;
    s.visible = false;
  });

  sections.forEach((s, i) => {
    const c = el('article', 'sw-copy');
    c.style.setProperty('--sw-accent', s.accent || '');
    c.innerHTML =
      `<span class="sw-copy__num">${pad(i + 1)} / ${pad(N)}</span>` +
      (s.eyebrow ? `<span class="sw-copy__eyebrow">${esc(s.eyebrow)}</span>` : '') +
      (s.title ? `<h2 class="sw-copy__title">${esc(s.title)}</h2>` : '') +
      (s.body ? `<p class="sw-copy__body">${esc(s.body)}</p>` : '') +
      (s.tags?.length ? `<ul class="sw-copy__tags">${s.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '') +
      (s.cta ? `<div class="sw-copy__cta">${ctaBtns(s.cta)}</div>` : '');
    copylayer.appendChild(c);
    copies.push(c);

    const dot = el('button', 'sw-route__dot');
    dot.innerHTML = `<span class="sw-route__label">${esc(s.label || '')}</span><i></i>`;
    dot.addEventListener('click', () => jumpTo(i));
    route.appendChild(dot);
    dots.push(dot);

    if (config.nav !== false) {
      const item = el('button', 'sw-nav__item');
      item.textContent = s.label || '';
      item.addEventListener('click', () => jumpTo(i));
      nav.appendChild(item);
    }
  });

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lingerEase = (x, L) => {
    L = clamp(L);
    const c = x - 0.5;
    return (1 - L) * x + L * (4 * c * c * c + 0.5);
  };

  let vh = window.innerHeight;
  let totalW = 0;
  let activeIndex = -1;
  let ticking = false;
  let laidOutW = window.innerWidth;

  function layout() {
    vh = window.innerHeight;
    laidOutW = window.innerWidth;
    let off = 0;
    SEGMENTS.forEach(s => { s.start = off * vh; off += s.w; s.end = off * vh; });
    totalW = off;
    track.style.height = (totalW * vh + vh) + 'px';
    read();
  }

  function jumpTo(i) {
    const seg = sections[i]._seg;
    window.scrollTo({ top: seg.start + (seg.end - seg.start) * 0.5, behavior: reduce ? 'auto' : 'smooth' });
  }

  function loadClip(s) {
    if (reduce || s.loading || !s.clip) return;
    s.loading = true;
    const url = (isMobile() && s.clipM) ? s.clipM : s.clip;
    const v = document.createElement('video');
    v.className = 'sw-scene__video';
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('disablePictureInPicture', '');
    v.crossOrigin = 'anonymous';
    v.src = url;
    v.addEventListener('loadedmetadata', () => { s.ready = true; read(); });
    const revealIfFramePainted = () => {
      if (v.readyState >= 2 && !v.seeking) s.el.classList.add('has-clip');
    };
    v.addEventListener('seeked', revealIfFramePainted, { once: true });
    v.addEventListener('loadeddata', () => {
      revealIfFramePainted();
      try { v.pause(); } catch (e) {}
      if (userReady) primeVideo(v);
    });
    const timer = setInterval(() => {
      if (v.readyState >= 2 && !v.seeking && s.cur > 0) {
        s.el.classList.add('has-clip');
        clearInterval(timer);
      }
      if (!s.video) clearInterval(timer);
    }, 250);
    v.addEventListener('error', () => { s.loading = false; s.hasClip = false; clearInterval(timer); });
    s.el.appendChild(v);
    s.video = v;
    s.hasClip = true;
  }

  function read() {
    const y = window.scrollY || window.pageYOffset;
    const fade = CROSSFADE * vh;
    let ci = 0;
    for (let i = 0; i < SEGMENTS.length; i++) if (y >= SEGMENTS[i].start) ci = i;

    for (let i = 0; i < SEGMENTS.length; i++) {
      const s = SEGMENTS[i];
      if (y > s.start - 1.4 * vh && y < s.end + 1.4 * vh) loadClip(s);
      const local = clamp((y - s.start) / (s.end - s.start), 0, 1);
      s.target = s.linger ? lingerEase(local, s.linger) : local;
      const outside = y < s.start ? s.start - y : (y > s.end ? y - s.end : 0);
      const op = smooth(1 - outside / fade);
      s.el.style.opacity = op;
      s.visible = op > 0.001;
      if (!s.hasClip || !s.ready) {
        const sc = reduce ? 1 : 1.02 + local * 0.1;
        s.img.style.transform = `translate3d(0, ${((0.5 - local) * 3).toFixed(2)}vh, 0) scale(${sc.toFixed(3)})`;
      }
    }

    const worldEnd = SEGMENTS[SEGMENTS.length - 1].end;
    for (let i = 0; i < N; i++) {
      const seg = sections[i]._seg;
      const pr = clamp((y - seg.start) / (seg.end - seg.start), 0, 1);
      const before = y < seg.start;
      const after = y > seg.end;
      let cop;
      if (i === 0) cop = after ? 0 : smooth(1 - pr / 0.62);
      else if (i === N - 1) cop = before ? 0 : after ? smooth(1 - (y - seg.end) / (0.6 * vh)) : smooth(pr / 0.42);
      else cop = (before || after) ? 0 : smooth(1 - Math.abs(pr - 0.5) / 0.5);
      const c = copies[i];
      c.style.opacity = cop;
      c.style.setProperty('--sw-drift', reduce ? '0vh' : `${((0.5 - pr) * 4).toFixed(2)}vh`);
      c.style.pointerEvents = cop > 0.5 ? 'auto' : 'none';
    }
    const routeOp = clamp(1 - Math.max(0, y - worldEnd) / (0.5 * vh));
    route.style.opacity = routeOp;
    route.style.pointerEvents = routeOp > 0.4 ? 'auto' : 'none';

    const cur = SEGMENTS[ci];
    const near = clamp(cur.kind === 'dive' ? cur.si : (((y - cur.start) / (cur.end - cur.start)) > 0.5 ? cur.si + 1 : cur.si), 0, N - 1);
    if (near !== activeIndex) {
      activeIndex = near;
      dots.forEach((d, k) => d.classList.toggle('is-active', k === near));
      nav.querySelectorAll('.sw-nav__item').forEach((n, k) => n.classList.toggle('is-active', k === near));
      container.style.setProperty('--sw-accent', sections[near].accent || '');
    }

    scrollbarFill.style.transform = `scaleX(${clamp(y / (totalW * vh))})`;
    hint.style.opacity = clamp(1 - y / (0.5 * vh));
    particles.style.transform = `translate3d(0, ${-y * 0.04}px, 0)`;
    ticking = false;
  }

  function raf() {
    const eps = isMobile() ? 0.02 : 0.008;
    for (let i = 0; i < SEGMENTS.length; i++) {
      const s = SEGMENTS[i];
      if (!s.hasClip || !s.ready || !s.video) continue;
      if (s.video.seeking) continue;
      if (!s.visible && Math.abs(s.cur - s.target) < 0.002) continue;
      s.cur += (s.target - s.cur) * (reduce ? 1 : 0.18);
      const dur = s.video.duration || 1;
      const t = clamp(s.cur, 0, 0.999) * dur;
      if (Math.abs(s.video.currentTime - t) > eps) {
        try { s.video.currentTime = t; } catch (e) {}
      }
    }
    requestAnimationFrame(raf);
  }

  let userReady = false;
  const primedVideos = new WeakSet();
  const primingVideos = new WeakSet();
  function primeVideo(v) {
    if (!isMobile() || !v || primedVideos.has(v) || primingVideos.has(v)) return;
    primingVideos.add(v);
    try {
      const p = v.play();
      if (p && p.then) p.then(() => { try { v.pause(); } catch (e) {} primedVideos.add(v); primingVideos.delete(v); }).catch(() => primingVideos.delete(v));
      else { try { v.pause(); } catch (e) {} primedVideos.add(v); primingVideos.delete(v); }
    } catch (e) {
      primingVideos.delete(v);
    }
  }
  function onUserGesture() {
    userReady = true;
    SEGMENTS.forEach(s => primeVideo(s.video));
  }
  window.addEventListener('pointerdown', onUserGesture, { passive: true });
  window.addEventListener('touchstart', onUserGesture, { passive: true });

  seedParticles(particles, reduce || coarse);
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } }, { passive: true });
  function onResize() {
    if (coarse && window.innerWidth === laidOutW) return;
    layout();
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', layout);
  window.addEventListener('load', layout);
  layout();
  requestAnimationFrame(raf);

  function el(tag, cls) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function esc(s) { return String(s).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function ctaBtns(cta) {
    let h = '';
    if (cta.primary) h += `<a class="sw-btn btn-primary" href="${esc(cta.primary.href || '#')}">${esc(cta.primary.label)}</a>`;
    if (cta.secondary) h += `<a class="sw-btn btn-ghost" href="${esc(cta.secondary.href || '#')}">${esc(cta.secondary.label)}</a>`;
    return h;
  }
}

function seedParticles(host, reduce) {
  if (!host || reduce) return;
  const kinds = ['dot', 'dot', 'ring'];
  const seeds = [7, 23, 41, 58, 71, 88, 12, 34, 52, 66, 83, 95, 18, 29, 47, 63, 77, 91, 5, 38, 55, 69, 82, 97];
  for (let k = 0; k < 20; k++) {
    const s = document.createElement('span');
    s.className = 'sw-pt sw-pt--' + kinds[k % kinds.length];
    s.style.left = seeds[k % seeds.length] + 'vw';
    s.style.top = ((seeds[(k * 3) % seeds.length] * 1.3) % 100) + 'vh';
    s.style.setProperty('--sw-sc', (0.5 + ((seeds[(k * 5) % seeds.length] % 60) / 60) * 1.1).toFixed(2));
    const dur = 14 + (seeds[(k * 7) % seeds.length] % 22);
    s.style.animationDuration = dur + 's';
    s.style.animationDelay = (-(seeds[(k * 2) % seeds.length] % dur)) + 's';
    host.appendChild(s);
  }
}

function injectCSS() {
  if (document.getElementById('sw-css')) return;
  const css = `
  .sw-root{--sw-bg:#14101c;--sw-ink:#f4f1fa;--sw-ink-soft:#b3a9c8;--sw-accent:#8a7bff;--sw-font-display:'Noto Sans JP','Inter',system-ui,sans-serif;--sw-font-body:'Inter','Noto Sans JP',system-ui,sans-serif;}
  html,body{margin:0;background:var(--sw-bg);overflow-x:hidden;color:var(--sw-ink);font-family:var(--sw-font-body);}
  .sw-particles{position:absolute;inset:-6% -2%;will-change:transform;}
  .sw-pt{position:absolute;width:13px;height:13px;transform:scale(var(--sw-sc,1));opacity:0;animation:sw-drift linear infinite;}
  .sw-pt::before{content:'';position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 34% 30%,rgba(255,255,255,.65),rgba(255,255,255,0) 72%);} .sw-pt--ring::before{background:transparent;border:1.5px solid color-mix(in srgb,var(--sw-accent) 55%,transparent);} 
  @keyframes sw-drift{0%{opacity:0;transform:scale(var(--sw-sc)) translate(0,12vh) rotate(0)}12%{opacity:.5}88%{opacity:.45}100%{opacity:0;transform:scale(var(--sw-sc)) translate(4vw,-22vh) rotate(210deg)}}
  @media (prefers-reduced-motion: reduce){.sw-pt{display:none;}}
  `;
  const style = document.createElement('style');
  style.id = 'sw-css';
  style.textContent = '@layer sw {\n' + css + '\n}';
  document.head.appendChild(style);
}

if (typeof window !== 'undefined') {
  window.mountScrollWorld = mountScrollWorld;
  window.addEventListener('DOMContentLoaded', () => {
    mountScrollWorld(document.getElementById('world'), {
      brand: { name: 'moruko', href: '#world' },
      hint: 'スクロールして飛び込む',
      nav: true,
      links: [
        { label: 'できること', href: '#features' },
        { label: '料金', href: '#pricing' },
        { label: '導入の流れ', href: '#howto' },
      ],
      cta: { label: 'LINEで無料相談', href: 'https://lin.ee/S09YSni' },
      diveScroll: 1.3,
      connScroll: 0.9,
      sections: [
        {
          label: 'はじまり',
          still: 'morukoimage/hero_bg.webp',
          accent: '#8A7BFF',
          eyebrow: 'AI SECRETARY',
          title: '話しかけるだけ。\nあとはモルコが働く。',
          body: 'メール・スケジュール・SNS投稿・動画編集まで、Telegramに話しかけるだけで全部やってくれる自分専用AI秘書。自宅のミニPCが24時間フル稼働します。',
          tags: ['Telegramだけで操作', '24時間稼働', '設定済みでお届け'],
          cta: { primary: { label: '今すぐ申し込む', href: 'https://docs.google.com/forms/d/e/1FAIpQLSc1LY01G24LIM4mA3z4XuhbX2RuA8BW28mHcDHicjmD-ONxfg/viewform' }, secondary: { label: 'できることを見る', href: '#features' } },
        },
        {
          label: 'しごと',
          still: 'morukoimage/minipc.webp',
          contain: true,
          accent: '#FFB84F',
          eyebrow: 'WHAT MORUKO DOES',
          title: '見た目はやわらかく、\n中身はかなり働く。',
          body: 'メール管理・スケジュール調整・タスク整理・朝ブリーフ・Drive検索・SNSと動画制作。「これ頼める？」をそのまま投げてください。',
          tags: ['メール管理', 'スケジュール調整', 'SNS・動画制作'],
        },
        {
          label: 'あんしん',
          still: 'morukoimage/char.webp',
          contain: true,
          accent: '#4F8CFF',
          eyebrow: 'TRUST & SUPPORT',
          title: '自宅で動く。\n情報は外に出さない。',
          body: 'モルコはクラウドではなく、あなたの自宅のPCで動きます。初期設定済みでお届けし、マンツーマンのレクチャーと専用相談Botで、使いこなせるまで伴走します。',
          tags: ['自宅ローカル稼働', 'プライバシー保護', 'マンツーマンレクチャー'],
          cta: { primary: { label: '料金を見る', href: '#pricing' }, secondary: { label: 'LINEで無料相談する', href: 'https://lin.ee/S09YSni' } },
          linger: 0.3,
        },
      ],
      connectors: [],
      connectorsMobile: [],
    });
  });
}
