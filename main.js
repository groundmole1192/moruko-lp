/* moruko LP v2 — motion layer (GSAP + ScrollTrigger). Everything degrades to a static page. */
(function () {
  'use strict';
  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- always-on behaviours ---------- */
  var nav = $('#nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // mobile sticky bar: show after hero, hide near final CTA / footer
  var mbar = $('#mbar');
  if (mbar && 'IntersectionObserver' in window) {
    var heroIn = true, endIn = false;
    var sync = function () { mbar.classList.toggle('is-on', !heroIn && !endIn); };
    var io1 = new IntersectionObserver(function (es) { es.forEach(function (e) { heroIn = e.isIntersecting; }); sync(); }, { threshold: 0.15 });
    var io2 = new IntersectionObserver(function (es) { endIn = es.some(function (e) { return e.isIntersecting; }); sync(); }, { threshold: 0.05 });
    var hero = $('#hero'); if (hero) io1.observe(hero);
    ['#contact', '#footer'].forEach(function (s) { var el = $(s); if (el) io2.observe(el); });
  }

  // video facade
  var vp = $('#videoPlay');
  if (vp) {
    vp.addEventListener('click', function () {
      var f = $('#videoFrame');
      var ifr = document.createElement('iframe');
      ifr.src = 'https://www.youtube.com/embed/h4Vyb0HzrWw?autoplay=1&rel=0';
      ifr.title = 'モルコ CM動画';
      ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      ifr.allowFullscreen = true;
      f.innerHTML = '';
      f.appendChild(ifr);
    });
  }

  // FAQ: animated open/close (keeps <details> semantics)
  $$('.faq-item').forEach(function (d) {
    var s = $('summary', d), body = $('.faq-body', d);
    if (!s || !body) return;
    s.addEventListener('click', function (e) {
      if (reduce || !hasGsap) return; // native toggle
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, opacity: 0, duration: .28, ease: 'power2.inOut', onComplete: function () { d.open = false; gsap.set(body, { clearProps: 'all' }); } });
      } else {
        d.open = true;
        gsap.from(body, { height: 0, opacity: 0, duration: .36, ease: 'power3.out', clearProps: 'all' });
      }
    });
  });

  // QR grid (deterministic pattern, no randomness so it renders the same every time)
  var qr = $('#v3Grid');
  if (qr) {
    var pat = '1111111010000101011101010111010101110101000010111111100000000011010101111000100101101010111011000001010111010000001011101010010';
    var html_ = '';
    for (var i = 0; i < 49; i++) html_ += '<i class="' + (pat[i] === '0' ? 'o' : '') + '"></i>';
    qr.innerHTML = html_;
  }

  /* ---------- static fallback ---------- */
  if (reduce || !hasGsap) {
    html.classList.remove('gs');
    $$('.flow li').forEach(function (li) { li.classList.add('is-on'); });
    var fl = $('#flowLine i'); if (fl) fl.style.transform = 'none';
    var hl = $('#howLine i'); if (hl) hl.style.transform = 'none';
    var hlh = $('#howLineH i'); if (hlh) hlh.style.transform = 'none';
    // hero: show the first scenario fully
    ['#hsReq', '#hsRep', '#hsTask', '#hsPacket'].forEach(function (s) { var el = $(s); if (el) el.style.opacity = 1; });
    var tp = $('#hsTyping'); if (tp) tp.style.display = 'none';
    var bar = $('#hsBar'); if (bar) bar.style.transform = 'none';
    var done = $('#hsDone'); if (done) done.style.transform = 'none';
    var pk = $('#hsPacket'); if (pk) { pk.style.left = '48%'; pk.style.top = '32%'; }
    // vignettes: show final state
    $$('.vg-lines i, .v2-label .bar i').forEach(function (el) { el.style.transform = 'none'; });
    // key visual: static final state
    var kvc = $('#kvCard'); if (kvc) kvc.style.opacity = 1;
    return;
  }

  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  gsap.defaults({ ease: 'power3.out' });
  var mobile = window.matchMedia('(max-width: 899px)').matches;

  /* ---------- scroll reveals ---------- */
  $$('.rv').forEach(function (el) {
    gsap.fromTo(el, { autoAlpha: 0, y: 22 }, {
      autoAlpha: 1, y: 0, duration: .8,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });
  $$('.rv-grid').forEach(function (grid) {
    var items = Array.prototype.slice.call(grid.children);
    gsap.fromTo(items, { autoAlpha: 0, y: 24, scale: .97 }, {
      autoAlpha: 1, y: 0, scale: 1, duration: .7, stagger: .09, ease: 'back.out(1.4)',
      scrollTrigger: { trigger: grid, start: 'top 85%', once: true }
    });
  });
  $$('.how-node').forEach(function (n, i) {
    gsap.fromTo(n, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .7, scrollTrigger: { trigger: n, start: 'top 88%', once: true } });
  });

  /* ---------- count-ups (facts only) ---------- */
  $$('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString('ja-JP'); },
      onComplete: function () { el.textContent = target.toLocaleString('ja-JP'); }
    });
  });

  /* ---------- askit underline ---------- */
  var mark = $('#askMark');
  if (mark) {
    gsap.set(mark, { '--u': 0 });
    gsap.to(mark, { '--u': 1, duration: .9, ease: 'expo.inOut', scrollTrigger: { trigger: mark, start: 'top 80%', once: true } });
  }

  /* ---------- how it works: scrub line + packet ---------- */
  var howDiagram = $('#howDiagram');
  if (howDiagram) {
    var lineHEl = $('#howLineH');
    var vertical = !lineHEl || getComputedStyle(lineHEl).display === 'none';
    if (vertical) {
      var line = $('#howLine'), fill = $('#howLine i'), packet = $('#howPacket');
      gsap.timeline({ scrollTrigger: { trigger: howDiagram, start: 'top 70%', end: 'bottom 55%', scrub: .6 } })
        .to(fill, { scaleY: 1, ease: 'none' }, 0)
        .to(packet, { y: function () { return line.offsetHeight; }, ease: 'none' }, 0);
    } else {
      var lineH = $('#howLineH'), fillH = $('#howLineH i'), packetH = $('#howPacketH');
      gsap.timeline({ scrollTrigger: { trigger: howDiagram, start: 'top 70%', end: 'bottom 40%', scrub: .6 } })
        .to(fillH, { scaleX: 1, ease: 'none' }, 0)
        .to(packetH, { x: function () { return lineH.offsetWidth; }, ease: 'none' }, 0);
    }
    $$('.how-node').forEach(function (n) {
      ScrollTrigger.create({ trigger: n, start: vertical ? 'top 62%' : 'top 70%', onEnter: function () { gsap.to($('.how-icon', n), { backgroundColor: '#ed7014', color: '#ffffff', duration: .4 }); },
        onLeaveBack: function () { gsap.to($('.how-icon', n), { backgroundColor: '#ffffff', color: '#ed7014', duration: .3 }); } });
    });
  }

  /* ---------- flow: line fill + step light-up ---------- */
  var flow = $('#flow');
  if (flow) {
    gsap.to('#flowLine i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: flow, start: 'top 65%', end: 'bottom 60%', scrub: .5 } });
    $$('li', flow).forEach(function (li) {
      ScrollTrigger.create({ trigger: li, start: 'top 68%', onEnter: function () { li.classList.add('is-on'); }, onLeaveBack: function () { li.classList.remove('is-on'); } });
      gsap.fromTo(li, { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: .7, scrollTrigger: { trigger: li, start: 'top 88%', once: true } });
    });
  }

  /* ---------- before / after wipe ---------- */
  var baStage = $('#baStage');
  if (baStage) {
    // the tint sweeps across; the two texts cross-fade so the mid state stays readable
    var baTl = gsap.timeline({ paused: true })
      .fromTo('#baAfter', { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', ease: 'none', duration: 1 }, 0)
      .fromTo('#baHandle', { left: '100%' }, { left: '0%', ease: 'none', duration: 1 }, 0)
      .fromTo('#baAfterContent', { autoAlpha: 0, x: 24 }, { autoAlpha: 1, x: 0, ease: 'none', duration: .5 }, .5)
      .fromTo('#baBeforeContent', { autoAlpha: 1 }, { autoAlpha: 0, x: -16, ease: 'none', duration: .5 }, .35);
    if (window.matchMedia('(max-width: 899px)').matches) {
      // phones: drag/swipe the handle instead of scroll-scrubbing (scrub fought with touch scrolling)
      baStage.classList.add('is-drag');
      // text lives under the images on phones so the wipe never slices a sentence in half
      var cap = document.createElement('div'); cap.className = 'ba-caption';
      var cb = $('#baBeforeContent').cloneNode(true), ca = $('#baAfterContent').cloneNode(true);
      cb.removeAttribute('id'); ca.removeAttribute('id'); cb.removeAttribute('style'); ca.removeAttribute('style');
      cap.appendChild(cb); cap.appendChild(ca); baStage.parentNode.insertBefore(cap, baStage.nextSibling);
      var capSide = null;
      baTl.eventCallback('onUpdate', function () {
        var side = baTl.progress() >= .5 ? 'after' : 'before';
        if (side === capSide) return; capSide = side;
        gsap.to(side === 'after' ? ca : cb, { autoAlpha: 1, y: 0, duration: .3, overwrite: true });
        gsap.to(side === 'after' ? cb : ca, { autoAlpha: 0, y: 6, duration: .2, overwrite: true });
      });
      gsap.set(ca, { autoAlpha: 0 }); capSide = 'before';
      var hint = $('.ba-hint'); if (hint) hint.textContent = 'まんなかの丸を左右にスライドすると「以前」と「以後」が切り替わります';
      var setPos = function (clientX) {
        var r = baStage.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, (clientX - r.left) / r.width)); // handle x as a fraction
        gsap.to(baTl, { progress: 1 - p, duration: .25, ease: 'power2.out', overwrite: true });
      };
      var dragging = false, sx = 0, sy = 0, decided = false;
      baStage.addEventListener('pointerdown', function (e) { dragging = true; decided = false; sx = e.clientX; sy = e.clientY; });
      baStage.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        if (!decided) {
          if (Math.abs(e.clientX - sx) < 6 && Math.abs(e.clientY - sy) < 6) return;
          decided = true;
          if (Math.abs(e.clientY - sy) > Math.abs(e.clientX - sx)) { dragging = false; return; } // vertical = page scroll
          try { baStage.setPointerCapture(e.pointerId); } catch (_) {}
        }
        setPos(e.clientX);
      });
      var end = function () { dragging = false; };
      baStage.addEventListener('pointerup', function (e) { if (!decided) setPos(e.clientX); end(); }); // tap = jump there
      baStage.addEventListener('pointercancel', end);
      // a one-time nudge so people see it moves
      ScrollTrigger.create({ trigger: baStage, start: 'top 70%', once: true, onEnter: function () {
        gsap.timeline().to(baTl, { progress: .35, duration: .6, ease: 'power2.out' }).to(baTl, { progress: 0, duration: .5, ease: 'power2.inOut' }, '+=.3');
      } });
    } else {
      ScrollTrigger.create({ trigger: baStage, start: 'top 72%', end: 'bottom 38%', scrub: .7, animation: baTl });
    }
  }

  /* ---------- box visual: line draw ---------- */
  var box = $('#boxVisual');
  if (box) {
    var shapes = $$('svg .d', box);
    shapes.forEach(function (s) { var L = s.getTotalLength ? s.getTotalLength() : 400; gsap.set(s, { strokeDasharray: L, strokeDashoffset: L }); });
    gsap.to(shapes, { strokeDashoffset: 0, duration: 1.1, stagger: .08, ease: 'power2.inOut', scrollTrigger: { trigger: box, start: 'top 80%', once: true } });
  }

  /* ---------- illustration reveals + gentle parallax ---------- */
  $$('.rv-img').forEach(function (el) {
    gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0 round 20px)' }, { clipPath: 'inset(0 0 0% 0 round 20px)', duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    var img = $('img', el);
    if (img) gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  var kvImg = $('.kv-img img');
  if (kvImg) gsap.to(kvImg, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- hero key visual: route draw, packet, rotating "done" card ---------- */
  var kv = $('#heroKv');
  if (kv) {
    var kvCard = $('#kvCard'), kvTitle = $('#kvCardTitle'), kvSub = $('#kvCardSub'), kvStatus = $('#kvStatus');
    gsap.from(kvStatus, { autoAlpha: 0, y: 10, duration: .6, delay: 1.2, ease: 'back.out(1.6)' });
    gsap.fromTo(kv, { y: 0 }, { y: -6, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    var dones = [
      ['お礼メール、送りました', '名刺の写真から 2分'],
      ['送り状、作れました', '住所のスクショから'],
      ['打ち合わせ、登録しました', '木曜14時・リマインド付き']
    ];
    var di = 0;
    var kvTl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: .4 });
    kvTl.call(function () { kvTitle.textContent = dones[di % 3][0]; kvSub.textContent = dones[di % 3][1]; })
      .set(kvCard, { autoAlpha: 0, y: 14, scale: .9 })
      .to(kvCard, { autoAlpha: 1, y: 0, scale: 1, duration: .55, ease: 'back.out(1.8)' }, '+=.9')
      .to({}, { duration: 2.6 })
      .to(kvCard, { autoAlpha: 0, y: -10, duration: .4, ease: 'power2.in' })
      .call(function () { di++; });
    gsap.delayedCall(2.2, function () { kvTl.play(); });
    ScrollTrigger.create({ trigger: kv, start: 'top 95%', end: 'bottom 5%', onLeave: function () { kvTl.pause(); }, onEnterBack: function () { kvTl.play(); } });
  }

  /* ---------- community moruko: idle float + blink ---------- */
  var cm = $('#communityMoruko');
  if (cm) gsap.to(cm, { y: -8, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  /* ---------- vignettes ---------- */
  function vignette(id, build) {
    var stage = $(id);
    if (!stage) return;
    // short gap between loops; once started it never pauses (a paused loop could freeze on its blank fade-out frame on mobile)
    var tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: .25, defaults: { ease: 'power3.out' } });
    build(tl, stage);
    ScrollTrigger.create({ trigger: stage, start: 'top 95%', once: true, onEnter: function () { tl.play(0); } });
  }
  // 1: business card -> email
  vignette('#vg1', function (tl, s) {
    var card = $('.v1-card', s), tag = $('.v1-tag', s), mail = $('.v1-mail', s), lines = $$('.v1-mail .vg-lines i', s), sent = $('.v1-sent', s), flash = $('.vg-flash', s);
    tl.set([mail, sent], { autoAlpha: 0 }).set(lines, { scaleX: 0, transformOrigin: 'left' })
      .fromTo(card, { autoAlpha: 0, y: 30, rotation: -14 }, { autoAlpha: 1, y: 0, rotation: -6, duration: .7, ease: 'back.out(1.6)' })
      .fromTo(tag, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .4 }, '-=.3')
      .to(flash, { autoAlpha: .9, duration: .08 }, '+=.3').to(flash, { autoAlpha: 0, duration: .35 })
      .fromTo(mail, { autoAlpha: 0, x: 24, scale: .96 }, { autoAlpha: 1, x: 0, scale: 1, duration: .6 }, '-=.1')
      .to(lines, { scaleX: 1, duration: .5, stagger: .14, ease: 'power2.out' })
      .to(mail, { y: -10, autoAlpha: .35, duration: .5, ease: 'power2.in' }, '+=.5')
      .fromTo(sent, { autoAlpha: 0, y: 10, scale: .8 }, { autoAlpha: 1, y: 0, scale: 1, duration: .5, ease: 'back.out(2)' }, '-=.2')
      .to({}, { duration: 1.2 })
      .to([card, tag, mail, sent], { autoAlpha: 0, duration: .4 });
  });
  // 2: screenshot -> label -> store
  vignette('#vg2', function (tl, s) {
    var shot = $('.v2-shot', s), tag = $('.vg-tag', s), label = $('.v2-label', s), llines = $$('.v2-label .vg-lines i', s), bars = $$('.v2-label .bar i', s), store = $('.v2-store', s), done = $('.v2-done', s);
    tl.set([label, store, done], { autoAlpha: 0 }).set(llines, { scaleX: 0, transformOrigin: 'left' }).set(bars, { scaleY: 0 })
      .fromTo(shot, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .6 })
      .fromTo(tag, { autoAlpha: 0 }, { autoAlpha: 1, duration: .4 }, '-=.2')
      .fromTo(label, { autoAlpha: 0, x: -20, rotation: -3 }, { autoAlpha: 1, x: 0, rotation: 0, duration: .6, ease: 'back.out(1.4)' }, '+=.3')
      .to(llines, { scaleX: 1, duration: .4, stagger: .1 })
      .to(bars, { scaleY: 1, duration: .25, stagger: .03, ease: 'power1.out' })
      .fromTo(store, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .5 }, '+=.2')
      .to(label, { x: '+=42%', y: '+=10%', scale: .72, duration: .8, ease: 'power2.inOut' })
      .fromTo(done, { autoAlpha: 0, y: 10, scale: .8 }, { autoAlpha: 1, y: 0, scale: 1, duration: .5, ease: 'back.out(2)' })
      .to({}, { duration: 1.2 })
      .to([shot, tag, label, store, done], { autoAlpha: 0, duration: .4 });
  });
  // 3: request -> QR -> printer -> paper
  vignette('#vg3', function (tl, s) {
    var bub = $('.v3-bubble', s), qrc = $('.v3-qr', s), cells = $$('.v3-qr .grid i:not(.o)', s), tag = $('.vg-tag', s), pr = $('.v3-printer', s), paper = $('.v3-paper', s), plines = $$('.v3-paper .vg-lines i', s);
    tl.set([qrc, tag, pr, paper], { autoAlpha: 0 }).set(cells, { scale: 0 }).set(plines, { scaleX: 0, transformOrigin: 'left' })
      .fromTo(bub, { autoAlpha: 0, scale: .6, transformOrigin: 'left bottom' }, { autoAlpha: 1, scale: 1, duration: .5, ease: 'back.out(1.8)' })
      .to(qrc, { autoAlpha: 1, duration: .3 }, '+=.3')
      .to(cells, { scale: 1, duration: .25, stagger: { each: .012, from: 'random' } })
      .fromTo(tag, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .4 }, '-=.2')
      .fromTo(pr, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .5 }, '+=.2')
      .fromTo(paper, { autoAlpha: 0, y: '-60%' }, { autoAlpha: 1, y: '0%', duration: .9, ease: 'power2.out' })
      .to(plines, { scaleX: 1, duration: .3, stagger: .1 }, '-=.4')
      .to({}, { duration: 1.2 })
      .to([bub, qrc, tag, pr, paper], { autoAlpha: 0, duration: .4 });
  });

  /* ---------- hero story: phone <-> home ---------- */
  var stage = $('#heroStage');
  if (stage) {
    var req = $('#hsReq'), typing = $('#hsTyping'), rep = $('#hsRep'), task = $('#hsTask'), taskText = $('#hsTaskText'), bar = $('#hsBar'), done = $('#hsDone');
    var packet = $('#hsPacket'), packetBack = $('#hsPacketBack'), moruko = $('#hsMoruko'), pc = $('#hsPc');
    var scenarios = [
      { req: 'この名刺の人に、お礼メール送っといて', att: true, task: '名刺を読み取り → お礼メールを作成', rep: '送りました。文面はDriveにも保存しています。' },
      { req: 'この住所に発送。送り状つくって', att: true, task: '住所を読み取り → 送り状PDFを作成', rep: '送り状できました。印刷してコンビニへどうぞ。' },
      { req: '来週どこかで打ち合わせ入れたい', att: false, task: '空き時間を確認 → カレンダーに登録', rep: '木曜14時で登録しました。リマインドも設定済みです。' }
    ];
    var idx = 0;
    function setScenario(sc) {
      req.innerHTML = sc.req + (sc.att ? '<span class="att"></span>' : '');
      taskText.textContent = sc.task;
      rep.textContent = sc.rep;
    }
    var hsPath = $('#hsPath');
    function setPath() { hsPath.setAttribute('d', window.matchMedia('(max-width: 899px)').matches ? 'M40 40 C 48 18, 62 14, 70 40' : 'M33 34 C 42 14, 56 12, 66 40'); }
    setPath();
    var pathOpts = { path: '#hsPath', align: '#hsPath', alignOrigin: [0.5, 0.5], autoRotate: false };
    var heroTl = gsap.timeline({ paused: true, repeat: -1, defaults: { ease: 'power3.out' } });
    heroTl
      .call(function () { setScenario(scenarios[idx % scenarios.length]); })
      .set([req, typing, rep, task], { autoAlpha: 0, scale: .7 })
      .set(bar, { scaleX: 0 }).set(done, { scale: 0 })
      .set([packet, packetBack], { autoAlpha: 0 })
      .to(req, { autoAlpha: 1, scale: 1, duration: .5, ease: 'back.out(1.7)' }, .2)
      .set(packet, { autoAlpha: 1, motionPath: Object.assign({ start: 0, end: 0 }, pathOpts) }, .7)
      .to(packet, { motionPath: Object.assign({ start: 0, end: 1 }, pathOpts), duration: 1.1, ease: 'power2.inOut' }, .7)
      .to(packet, { autoAlpha: 0, duration: .2 }, 1.7)
      .to(pc, { scale: 1.06, duration: .18, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.7)
      .to(moruko, { y: '-8%', duration: .22, yoyo: true, repeat: 1, ease: 'power1.out' }, 1.75)
      .to(task, { autoAlpha: 1, scale: 1, duration: .5, ease: 'back.out(1.6)' }, 2.0)
      .to(bar, { scaleX: 1, duration: 1.5, ease: 'power1.inOut' }, 2.3)
      .to(done, { scale: 1, duration: .4, ease: 'back.out(2.5)' }, 3.8)
      .set(packetBack, { autoAlpha: 1, motionPath: Object.assign({ start: 1, end: 1 }, pathOpts) }, 4.1)
      .to(packetBack, { motionPath: Object.assign({ start: 1, end: 0 }, pathOpts), duration: 1.0, ease: 'power2.inOut' }, 4.1)
      .to(packetBack, { autoAlpha: 0, duration: .2 }, 5.0)
      .to(typing, { autoAlpha: 1, scale: 1, duration: .3 }, 5.0)
      .to(typing, { autoAlpha: 0, duration: .2 }, 5.9)
      .to(rep, { autoAlpha: 1, scale: 1, duration: .5, ease: 'back.out(1.7)' }, 6.0)
      .to({}, { duration: 2.6 }, 6.5)
      .to([req, rep, task], { autoAlpha: 0, y: -8, duration: .45, ease: 'power2.in' }, 9.1)
      .set([req, rep, task], { y: 0 }, 9.6)
      .call(function () { idx++; }, null, 9.6);

    ScrollTrigger.create({ trigger: stage, start: 'top 95%', end: 'bottom 5%',
      onEnter: function () { heroTl.play(); }, onEnterBack: function () { heroTl.play(); },
      onLeave: function () { heroTl.pause(); }, onLeaveBack: function () { heroTl.pause(); } });
    document.addEventListener('visibilitychange', function () { if (document.hidden) heroTl.pause(); else if (ScrollTrigger.isInViewport(stage)) heroTl.play(); });
    // motionPath alignment is measured once per tween; re-measure after a resize
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { setPath(); heroTl.invalidate().restart(); idx = 0; }, 200); });

    // blink
    if (moruko) {
      (function blink() {
        var t = 2600 + Math.random() * 2400;
        setTimeout(function () { moruko.classList.add('blink'); setTimeout(function () { moruko.classList.remove('blink'); blink(); }, 130); }, t);
      })();
    }
  }

  // layout settled (fonts) -> refresh triggers
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
