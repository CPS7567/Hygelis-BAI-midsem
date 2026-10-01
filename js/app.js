// Hygelis walkthrough: step tracking, progress + time left, keyboard/next navigation,
// scroll reveals, one-film-at-a-time playback and offline captions.
(function () {
  document.documentElement.classList.remove('no-js');
  const steps = Array.from(document.querySelectorAll('main > section[data-step]'));
  const total = steps.length;
  const secs = steps.map(s => +s.dataset.secs || 0);
  const $ = (id) => document.getElementById(id);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  let current = 0;

  // Step rail
  const rail = $('rail');
  steps.forEach((s, i) => {
    const a = document.createElement('a');
    a.href = '#' + s.id;
    a.innerHTML = `<span>${String(i + 1).padStart(2, '0')} · ${s.dataset.step}</span>`;
    a.setAttribute('aria-label', `Step ${i + 1}: ${s.dataset.step}`);
    rail.appendChild(a);
  });
  const dots = Array.from(rail.children);

  function setCurrent(i) {
    current = i;
    $('stepNum').textContent = `Step ${i + 1} of ${total}`;
    $('stepName').textContent = steps[i].dataset.step;
    dots.forEach((d, k) => { d.classList.toggle('active', k === i); d.classList.toggle('done', k < i); });
    document.body.classList.toggle('on-dark', steps[i].classList.contains('dark'));
    const left = secs.slice(i).reduce((a, b) => a + b, 0);
    $('timeLeft').textContent = left > 0 ? `≈ ${fmt(left)} left` : 'Story complete';
  }
  const stepObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) setCurrent(steps.indexOf(e.target)); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  steps.forEach(s => stepObs.observe(s));
  setCurrent(0);

  // Progress bar
  const bar = $('progress');
  const onScroll = () => { const h = document.documentElement; const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight); bar.style.width = (p * 100).toFixed(2) + '%'; };
  document.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Step navigation
  const go = (i) => { i = Math.max(0, Math.min(total - 1, i)); steps[i].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  $('prevBtn').addEventListener('click', () => go(current - 1));
  $('nextBtn').addEventListener('click', () => go(current + 1));
  document.addEventListener('keydown', (e) => {
    const t = e.target; if (e.altKey || e.ctrlKey || e.metaKey || (t && (t.tagName === 'VIDEO' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
  });

  // Reveal on scroll
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revObs.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));

  // Films: one at a time, pause when scrolled away, offline captions
  let ccOn = false;
  try { ccOn = localStorage.getItem('hygelis-cc') === '1'; } catch (e) { /* storage unavailable */ }
  const players = Array.from(document.querySelectorAll('.player'));
  const ccButtons = Array.from(document.querySelectorAll('.cc'));
  const syncCC = () => ccButtons.forEach(b => b.setAttribute('aria-pressed', String(ccOn)));
  ccButtons.forEach(b => b.addEventListener('click', () => {
    ccOn = !ccOn; syncCC();
    try { localStorage.setItem('hygelis-cc', ccOn ? '1' : '0'); } catch (e) { /* ignore */ }
    players.forEach(p => p._update && p._update());
  }));
  syncCC();
  const caps = window.HYGELIS_CAPTIONS || {};
  players.forEach(p => {
    const v = p.querySelector('video'), box = p.querySelector('.cap'), cues = caps[p.dataset.video] || [];
    v.playbackRate = 1.35;
    v.addEventListener('loadedmetadata', () => { v.playbackRate = 1.35; });
    p._update = () => {
      const t = v.currentTime, c = ccOn ? cues.find(q => t >= q[0] && t <= q[1] + 0.15) : null;
      if (c) { if (box.textContent !== c[2]) box.textContent = c[2]; box.classList.add('show'); } else box.classList.remove('show');
    };
    v.addEventListener('timeupdate', p._update);
    v.addEventListener('seeked', p._update);
    v.addEventListener('play', () => players.forEach(o => { const ov = o.querySelector('video'); if (ov !== v && !ov.paused) ov.pause(); }));
  });
  const vidObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { const v = e.target.querySelector('video'); if (!e.isIntersecting && !v.paused) v.pause(); });
  }, { threshold: 0.25 });
  players.forEach(p => vidObs.observe(p));
})();
