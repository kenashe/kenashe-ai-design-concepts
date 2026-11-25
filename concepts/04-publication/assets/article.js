// Concept 04 · feature article behaviour: reading time, progress, reading mode, sidenotes, timestamp chips.
(() => {
  const doc = document.documentElement;
  const body = document.querySelector('.art-body');
  if (!body) return;

  /* ---- Reading time from the real word count of the article body (excl. captions & notes) ---- */
  const clone = body.cloneNode(true);
  clone.querySelectorAll('figure, .sn, .chip-row, .sn-ref, .pq').forEach(n => n.remove());
  const words = (clone.textContent.match(/[\p{L}\p{N}’'-]+/gu) || []).length;
  const mins = Math.max(1, Math.round(words / 230));
  document.querySelectorAll('[data-readtime]').forEach(el => { el.textContent = `${mins} min read · ${words.toLocaleString('en-US')} words`; });

  /* ---- Accessible reading progress ---- */
  const prog = document.querySelector('.progress');
  if (prog) {
    let ticking = false, last = -1;
    const update = () => {
      ticking = false;
      const r = body.getBoundingClientRect();
      const total = r.height - innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (-r.top + innerHeight * 0.25) / Math.max(1, total)));
      prog.style.setProperty('--p', p.toFixed(4));
      const pct = Math.round(p * 100);
      if (pct !== last) { prog.setAttribute('aria-valuenow', pct); prog.setAttribute('aria-valuetext', `${pct}% read`); last = pct; }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---- Reading mode (size / face / paper), remembered in localStorage ---- */
  const KEY = 'pub04-reading';
  const btn = document.querySelector('.rm-btn');
  const panel = document.getElementById('rm-panel');
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const apply = s => {
    ['size', 'face', 'theme'].forEach(k => { if (s[k] && s[k] !== 'm' && s[k] !== 'serif' && s[k] !== 'light') doc.dataset[k] = s[k]; else delete doc.dataset[k]; });
  };
  if (btn && panel) {
    const state = Object.assign({ size: 'm', face: 'serif', theme: 'light' }, read());
    panel.querySelectorAll('input[type=radio]').forEach(inp => {
      inp.checked = state[inp.name] === inp.value;
      inp.addEventListener('change', () => {
        state[inp.name] = inp.value; apply(state);
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
      });
    });
    panel.querySelector('.reset')?.addEventListener('click', () => {
      Object.assign(state, { size: 'm', face: 'serif', theme: 'light' }); apply(state);
      panel.querySelectorAll('input[type=radio]').forEach(i => { i.checked = state[i.name] === i.value; });
      try { localStorage.removeItem(KEY); } catch {}
    });
    const close = (refocus) => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (refocus) btn.focus(); };
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      panel.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open) panel.querySelector('input:checked')?.focus();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(true); });
    document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close(false); });
  }

  /* ---- Sidenotes: margin notes on wide screens, toggled popovers below 1100px ---- */
  const wide = matchMedia('(min-width: 1100px)');
  document.querySelectorAll('.sn-ref').forEach(ref => {
    const note = document.getElementById(ref.getAttribute('aria-controls'));
    if (!note) return;
    ref.addEventListener('click', () => {
      if (wide.matches) return;
      const open = ref.getAttribute('aria-expanded') !== 'true';
      ref.setAttribute('aria-expanded', String(open));
      note.classList.toggle('is-open', open);
    });
  });
  const syncWide = () => document.querySelectorAll('.sn-ref').forEach(r => {
    r.tabIndex = wide.matches ? -1 : 0;
    if (wide.matches) r.removeAttribute('aria-expanded'); else if (!r.hasAttribute('aria-expanded')) r.setAttribute('aria-expanded', 'false');
  });
  syncWide(); wide.addEventListener?.('change', syncWide);

  /* ---- "Watch from 0:12" chips: open the walkthrough inline at that moment ---- */
  const resetChip = c => { c.setAttribute('aria-expanded', 'false'); c.querySelector('.lbl').textContent = 'Watch from'; };
  document.querySelectorAll('a.chip[data-start]').forEach(chip => {
    chip.setAttribute('role', 'button');
    chip.setAttribute('aria-expanded', 'false');
    const row = chip.closest('.chip-row');
    const pid = chip.getAttribute('aria-controls');
    chip.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); chip.click(); } });
    chip.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      const existing = document.getElementById(pid);
      document.querySelectorAll('.inline-player').forEach(p => p.remove());
      document.querySelectorAll('a.chip[data-start]').forEach(resetChip);
      if (existing) { chip.focus(); return; }
      const player = document.createElement('figure');
      player.className = 'inline-player';
      player.id = pid;
      const frame = document.createElement('div'); frame.className = 'yt-frame';
      const cap = document.createElement('figcaption'); cap.className = 'caption';
      cap.innerHTML = `<span>Playing from <b>${chip.dataset.t}</b> · 4 AI Filmmaking Tips That Make Videos Feel Like Films</span><a class="inline-link" href="${chip.href}" target="_blank" rel="noopener">Open on YouTube ↗</a>`;
      player.append(frame, cap);
      row.after(player); // the player opens directly beneath the chip, so the reader keeps their place
      window.pubLoadYT(frame, chip.dataset.yt, chip.dataset.start, `Ken Ashe: 4 AI Filmmaking Tips, from ${chip.dataset.t}`);
      chip.setAttribute('aria-expanded', 'true');
      chip.querySelector('.lbl').textContent = 'Close video at';
      chip.focus();
    });
  });
})();
