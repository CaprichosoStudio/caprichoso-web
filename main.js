(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Split hero claim into words for a staggered rise
  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });

  // Manifesto: words light up as they cross the viewport
  const manifesto = document.querySelector('[data-words]');
  let mWords = [];
  if (manifesto) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t.trim()) { frag.append(t); return; }
            const s = document.createElement('span'); s.className = 'mw'; s.textContent = t; frag.append(s);
          });
          n.replaceWith(frag);
        } else walk(n);
      });
    };
    walk(manifesto);
    mWords = [...manifesto.querySelectorAll('.mw')];
    if (reduce) mWords.forEach((w) => w.classList.add('on'));
  }

  requestAnimationFrame(() => setTimeout(() => root.classList.add('is-loaded'), 60));

  // Reveal on scroll, staggered inside the same parent
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const sibs = [...e.target.parentElement.querySelectorAll(':scope > [data-reveal]')];
      e.target.style.setProperty('--d', `${Math.max(0, sibs.indexOf(e.target)) * 90}ms`);
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  // Nav: background after hero, hide on scroll down
  const nav = document.querySelector('[data-nav]');
  const dock = document.querySelector('[data-dock]');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (dock) dock.classList.toggle('is-on', y > innerHeight * 0.7 && y < document.body.scrollHeight - innerHeight * 1.6);
    lastY = y;
    if (mWords.length && !reduce) {
      const r = manifesto.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
      const n = Math.round(p * mWords.length);
      mWords.forEach((w, i) => w.classList.toggle('on', i < n));
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  // Booking: every [data-book] opens the calendar (click 1); picking a slot is click 2
  const dialog = document.querySelector('[data-book-dialog]');
  const cal = dialog && dialog.querySelector('[data-cal]');
  let calLoaded = false;
  const openBooking = () => {
    if (!dialog) return;
    const url = cal && cal.dataset.cal;
    if (url && !calLoaded) {
      const f = document.createElement('iframe');
      f.src = url; f.title = 'Calendario de reservas'; f.loading = 'eager';
      cal.innerHTML = ''; cal.append(f); calLoaded = true;
    }
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  };
  document.querySelectorAll('[data-book]').forEach((b) => b.addEventListener('click', openBooking));
  dialog?.querySelector('[data-book-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  // Warm up the calendar when someone shows intent
  if (cal && cal.dataset.cal) {
    const pre = () => { const l = document.createElement('link'); l.rel = 'preconnect'; l.href = new URL(cal.dataset.cal).origin; document.head.append(l); };
    document.querySelector('[data-book]')?.addEventListener('pointerenter', pre, { once: true });
  }

})();
