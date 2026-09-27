// HDB Halls pitch: board ordering, flap animation, WhatsApp message builder.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const AREAS = { // rough district centroids (straight-line reference points)
  north: { lat: 24.826, lng: 46.645, label: 'شمال الرياض' },
  east: { lat: 24.805, lng: 46.780, label: 'شرق الرياض' },
  west: { lat: 24.770, lng: 46.600, label: 'غرب الرياض' },
  center: { lat: 24.690, lng: 46.685, label: 'وسط الرياض' },
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const form = $('#planner'), rowsEl = $('#rows'), note = $('#planner-note'), locateBtn = $('#locate');
let origin = AREAS.north;

// clock (Riyadh time, Latin digits)
const clock = $('#clock');
const tick = () => { clock.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit' }).format(new Date()); };
tick(); setInterval(tick, 15000);

function km(a, b) {
  const R = 6371, rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function state() {
  const fd = new FormData(form);
  return { occ: fd.get('occ'), date: fd.get('date'), guests: parseInt(fd.get('guests'), 10) || 0 };
}

function message(hall, s, opts = {}) {
  if (opts.visit) return `السلام عليكم، أبغى أحجز موعد زيارة لـ${hall}.${s.occ ? ` المناسبة: ${s.occ}.` : ''}`;
  let m = `السلام عليكم، أبغى أستفسر عن حجز ${hall} لـ${opts.occ || s.occ}`;
  if (s.date) m += `، بتاريخ ⁦${s.date}⁩`;
  if (s.guests) m += `، وعدد الضيوف تقريبًا ⁦${s.guests}⁩`;
  return m + '. وصلتكم من الموقع.';
}

function updateLinks() {
  const s = state();
  $$('[data-wa]').forEach(a => {
    const num = a.dataset.wa === 'group' ? '0531237724' : a.dataset.wa;
    const hall = a.dataset.hall || 'قاعات هدب';
    const text = message(hall, s, { visit: a.dataset.visit, occ: a.dataset.occ });
    a.href = `https://wa.me/966${num.replace(/^0/, '')}?text=${encodeURIComponent(text)}`;
    a.target = '_blank'; a.rel = 'noopener';
  });
}

function flip(el, delay) {
  if (reduced) return;
  el.classList.remove('flipping'); void el.offsetWidth;
  el.style.animationDelay = `${delay}ms`; el.classList.add('flipping');
}

function render(animate = true) {
  const s = state();
  const rows = $$('.row', rowsEl).map(r => ({ r, d: km(origin, { lat: +r.dataset.lat, lng: +r.dataset.lng }) }));
  rows.sort((a, b) => a.d - b.d);
  rows.forEach(({ r, d }, i) => {
    rowsEl.appendChild(r);
    $('.dist .pre', r).textContent = d < 1 ? 'أقل من' : '≈';
    $('.dist .num', r).innerHTML = [...String(Math.max(1, Math.round(d)))].map(c => `<span class="ch">${c}</span>`).join('');
    r.classList.toggle('is-first', i === 0);
    const flag = $('.flag', r), max = +r.dataset.max || 0;
    const over = max && s.guests > max;
    r.classList.toggle('is-dim', !!over);
    flag.hidden = !over;
    if (over) flag.textContent = `السعة المنشورة حتى ${max} ضيف تقريبًا. اسألنا عن البدائل.`;
    if (animate) {
      $$('.flap:not(.dist)', r).forEach((f, j) => flip(f, i * 90 + j * 45));
      $$('.dist .ch', r).forEach((c, j) => flip(c, i * 90 + 120 + j * 70));
    }
  });
  const first = $('.row .name b', rowsEl).textContent;
  note.innerHTML = `${s.occ}: الأقرب لـ${origin.label} <b>${first}</b>. اضغط «احجز» وتوصل رسالتك جاهزة.`;
  updateLinks();
}

form.addEventListener('change', e => {
  if (e.target.name === 'area') { origin = AREAS[e.target.value]; locateBtn.setAttribute('aria-pressed', 'false'); render(); }
  else render(e.target.name !== 'date');
});
form.addEventListener('input', e => { if (e.target.name === 'guests' || e.target.name === 'date') updateLinks(); });
form.addEventListener('submit', e => e.preventDefault());

locateBtn.setAttribute('aria-pressed', 'false');
locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) { note.textContent = 'المتصفح لا يدعم تحديد الموقع. اختر المنطقة يدويًا.'; return; }
  note.textContent = 'نحدد موقعك…';
  navigator.geolocation.getCurrentPosition(p => {
    origin = { lat: p.coords.latitude, lng: p.coords.longitude, label: 'موقعك' };
    $$('input[name="area"]', form).forEach(i => { i.checked = false; });
    locateBtn.setAttribute('aria-pressed', 'true');
    render();
  }, () => { note.textContent = 'ما قدرنا نحدد موقعك. اختر المنطقة من الخيارات.'; }, { timeout: 8000 });
});

// hide the video element's broken state when hero.mp4 is missing: keep the poster
const vid = $('.hero-video');
vid.addEventListener('error', () => { vid.removeAttribute('src'); vid.load(); }, true);

render(!reduced);
