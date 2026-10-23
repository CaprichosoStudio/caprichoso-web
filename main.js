// nav: cambia de color según la superficie que tiene debajo
const nav = document.getElementById('nav');
const surfaces = [...document.querySelectorAll('[data-theme]')];
function syncNav() {
  const y = 36;
  for (const s of surfaces) {
    const r = s.getBoundingClientRect();
    if (r.top <= y && r.bottom > y) { nav.dataset.on = s.dataset.theme; break; }
  }
}
addEventListener('scroll', syncNav, { passive: true }); syncNav();

// aparición
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.rv').forEach(el => io.observe(el));

// slider de principios 01/03
const slides = [...document.querySelectorAll('.slide')];
let i = 0;
function go(n) {
  i = (n + slides.length) % slides.length;
  slides.forEach((s, k) => s.classList.toggle('on', k === i));
  document.getElementById('bar').style.transform = `translateX(${i * 100}%)`;
  document.getElementById('count').textContent = `0${i + 1}/0${slides.length}`;
}
document.getElementById('prev').onclick = () => go(i - 1);
document.getElementById('next').onclick = () => go(i + 1);
setInterval(() => go(i + 1), 6000);

// reloj de España y estado de la noche
function tick() {
  const now = new Date();
  const hm = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const h = +hm.slice(0, 2);
  const open = h >= 23 || h < 6;
  document.getElementById('status').textContent = open ? `Son las ${hm}. Estamos de noche.` : `Son las ${hm}. Quedan ${23 - h} h para abrir puertas.`;
}
tick(); setInterval(tick, 20000);

// Sonido al pasar el ratón, como en Monolog. Todo sintetizado con Web Audio (sin archivos).
// Empieza apagado: el navegador no deja sonar nada hasta que la persona toca la página.
(() => {
  const btn = document.getElementById('sound');
  if (!btn || !window.AudioContext && !window.webkitAudioContext) { if (btn) btn.hidden = true; return; }
  let ctx = null, on = false;
  try { on = localStorage.getItem('caprichoso-sound') === 'on'; } catch (e) {}
  const render = () => { btn.setAttribute('aria-pressed', on); btn.classList.toggle('is-on', on); btn.title = on ? 'Silenciar' : 'Activar sonido'; };
  const ensure = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };

  // un tono corto con caída rápida
  function blip(f0, f1, dur, vol, type = 'sine', delay = 0) {
    const c = ensure(), t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  // ruido filtrado, para un "tss" de hi-hat
  function hat(vol = 0.05, dur = 0.05) {
    const c = ensure(), t = c.currentTime, n = Math.floor(c.sampleRate * dur);
    const b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  }
  // un único sonido: el bombo de servicios, un pelín más agudo
  const thump = () => blip(190, 62, 0.16, 0.15);
  const play = () => { if (on) try { thump(); } catch (e) {} };

  // solo los elementos que se animan al pasar el ratón
  let last = 0;
  document.querySelectorAll('.btn, .nav ul a, .svc, .faq summary').forEach((el) => {
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now(); if (now - last < 40) return; last = now;
      play();
    });
  });

  btn.addEventListener('click', () => {
    on = !on; render();
    try { localStorage.setItem('caprichoso-sound', on ? 'on' : 'off'); } catch (e) {}
    if (on) play();
  });
  render();
})();
