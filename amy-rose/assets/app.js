// Design-your-table builder: plain JS, no backend. Choices -> SVG plan -> prefilled WhatsApp message.
const WA = "966501068859";
const form = document.getElementById("builder");
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";

const SHAPES = { rect: "مستطيلة", oval: "بيضاوية", round: "دائرية", square: "مربعة" };
const TOPS = {
  "marble-white": ["رخام أبيض بعروق رمادية", "assets/sw-marble-white.jpg"],
  "marble-black": ["رخام أسود بعروق ذهبية", "assets/sw-marble-black.jpg"],
  walnut: ["خشب بقشرة الجوز", "assets/sw-walnut.jpg"],
  glass: ["زجاج برونزي", "assets/sw-glass.jpg"],
};
// General sizing guidance (cm), not a maker spec. Round/square only offer the seat counts that work.
const SIZE = {
  rect: { 4: [140, 90], 6: [180, 90], 8: [220, 100], 10: [260, 100], 12: [300, 110] },
  oval: { 4: [150, 95], 6: [190, 100], 8: [230, 110], 10: [270, 115], 12: [310, 120] },
  round: { 4: [110, 110], 6: [130, 130], 8: [150, 150] },
  square: { 4: [100, 100], 8: [150, 150] },
};
const LIMIT = { len: [60, 400], wid: [60, 150] };
// Arabic number agreement: 3–10 take the plural, 11+ the accusative singular.
const people = (n) => (n >= 11 ? `${n} شخصًا` : `${n} أشخاص`);
const chairsTxt = (n) => (n >= 11 ? `${n} كرسيًا` : `${n} كراسي`);
const sizeTxt = (shape, l, w) =>
  shape === "round" ? `القطر ${l} سم` : shape === "square" ? `الضلع ${l} سم` : `الطول ${l} سم، العرض ${w} سم`;

const val = (name) => form.elements[name].value;

function syncSeats(shape) {
  const allowed = Object.keys(SIZE[shape]);
  form.querySelectorAll('input[name="seats"]').forEach((r) => (r.disabled = !allowed.includes(r.value)));
  if (!allowed.includes(val("seats"))) {
    const cur = +val("seats") || 8;
    const pick = allowed.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a));
    form.querySelector(`input[name="seats"][value="${pick}"]`).checked = true;
  }
  $("seats-hint").textContent =
    shape === "round" ? "الدائرية تناسب حتى 8 أشخاص. للعدد الأكبر اختر مستطيلة أو بيضاوية."
    : shape === "square" ? "المربعة تناسب 4 أو 8 أشخاص."
    : "";
}

function applySuggested() {
  const [l, w] = SIZE[val("shape")][val("seats")];
  $("len").value = l;
  $("wid").value = w;
}

function readDims(show = true) {
  const shape = val("shape");
  const one = shape === "round" || shape === "square";
  let l = Math.round(+$("len").value);
  let w = one ? l : Math.round(+$("wid").value);
  let err = "";
  const bad = (v, [a, b]) => !v || v < a || v > b;
  const lenLimit = one ? [60, 200] : LIMIT.len;
  if (bad(l, lenLimit)) err = `${one ? "القطر" : "الطول"} بين ${lenLimit[0]} و${lenLimit[1]} سم.`;
  else if (!one && bad(w, LIMIT.wid)) err = `العرض بين ${LIMIT.wid[0]} و${LIMIT.wid[1]} سم.`;
  else if (!one && w > l) err = "العرض أكبر من الطول. تأكد من الأرقام.";
  if (show || !err) {
    $("len").setAttribute("aria-invalid", bad(l, lenLimit));
    $("wid").setAttribute("aria-invalid", !one && bad(w, LIMIT.wid));
    $("dim-error").textContent = err;
  }
  return { l, w, one, ok: !err };
}

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent && parent.appendChild(n);
  return n;
}

function seatPositions(shape, n, cx, cy, w, h) {
  const p = [];
  if (shape === "round") {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      p.push([cx + Math.cos(a) * (w / 2 + 20), cy + Math.sin(a) * (h / 2 + 20), (a * 180) / Math.PI + 90]);
    }
    return p;
  }
  if (shape === "square") {
    const per = n / 4;
    for (let i = 0; i < per; i++) {
      const t = -w / 2 + (w * (i + 0.5)) / per;
      p.push([cx + t, cy - h / 2 - 20, 0], [cx + t, cy + h / 2 + 20, 180], [cx - w / 2 - 20, cy + t, 270], [cx + w / 2 + 20, cy + t, 90]);
    }
    return p;
  }
  if (shape === "oval") {
    const ends = n >= 6 ? 2 : 0;
    const side = (n - ends) / 2;
    const a = w / 2, b = h / 2;
    for (let i = 0; i < side; i++) {
      const x = cx - a * 0.8 + (a * 1.6 * (i + 0.5)) / side; // keep side chairs off the tight ends
      const dy = b * Math.sqrt(1 - ((x - cx) / a) ** 2) + 20;
      const u = (x - cx) / a;
      const tilt = (Math.atan2(b * u, a * Math.sqrt(1 - u * u)) * 180) / Math.PI; // tangent of the ellipse
      p.push([x, cy - dy, tilt], [x, cy + dy, 180 - tilt]);
    }
    if (ends) p.push([cx - a - 20, cy, 270], [cx + a + 20, cy, 90]);
    return p;
  }
  const ends = n >= 6 ? 2 : 0;
  const side = (n - ends) / 2;
  for (let i = 0; i < side; i++) {
    const x = cx - w / 2 + (w * (i + 0.5)) / side;
    p.push([x, cy - h / 2 - 20, 0], [x, cy + h / 2 + 20, 180]);
  }
  if (ends) p.push([cx - w / 2 - 20, cy, 270], [cx + w / 2 + 20, cy, 90]);
  return p;
}

function draw(show = true) {
  const shape = val("shape");
  const seats = +val("seats");
  const { l, w, one, ok } = readDims(show);
  if (!ok && !show) return; // mid-typing: keep the last valid drawing
  const L = ok ? l : SIZE[shape][seats][0];
  const W = ok ? w : SIZE[shape][seats][1];

  const s = Math.min(230 / L, 130 / W);
  const tw = L * s, th = W * s, cx = 200, cy = 128;

  const table = $("plan-table"), seatsG = $("plan-seats"), dims = $("plan-dims");
  table.replaceChildren(); seatsG.replaceChildren(); dims.replaceChildren();

  $("mat-img").setAttribute("href", TOPS[val("top")][1]);
  const common = { fill: "url(#mat)", stroke: "rgba(255,255,255,.22)", "stroke-width": 1 };
  if (shape === "round" || shape === "oval") el("ellipse", { cx, cy, rx: tw / 2, ry: th / 2, ...common }, table);
  else el("rect", { x: cx - tw / 2, y: cy - th / 2, width: tw, height: th, rx: 3, ...common }, table);

  const chairs = val("chairs") === "yes";
  for (const [x, y, r] of seatPositions(shape, seats, cx, cy, tw, th)) {
    el("rect", { x: -14, y: -9, width: 28, height: 18, rx: 5, class: chairs ? "seat" : "seat seat-off", transform: `translate(${x} ${y}) rotate(${r})` }, seatsG);
  }

  // Dimension lines (geometry stays LTR; each label carries its own direction)
  const top = cy - th / 2 - 48;
  el("line", { x1: cx - tw / 2, y1: top, x2: cx + tw / 2, y2: top, class: "dim" }, dims);
  for (const x of [cx - tw / 2, cx + tw / 2]) el("line", { x1: x, y1: top - 5, x2: x, y2: top + 5, class: "dim" }, dims);
  const t1 = el("text", { x: cx, y: top - 9, "text-anchor": "middle", class: "dim-text", direction: "rtl" }, dims);
  t1.textContent = one ? `${shape === "round" ? "القطر" : "الضلع"} ${L} سم` : `${L} سم`;
  if (!one) {
    const side = cx + tw / 2 + 28;
    el("line", { x1: side, y1: cy - th / 2, x2: side, y2: cy + th / 2, class: "dim" }, dims);
    for (const y of [cy - th / 2, cy + th / 2]) el("line", { x1: side - 5, y1: y, x2: side + 5, y2: y, class: "dim" }, dims);
    const t2 = el("text", { x: side + 6, y: cy + 4, "text-anchor": "end", class: "dim-text", direction: "rtl" }, dims);
    t2.textContent = `${W} سم`;
  }

  $("t-shape").textContent = `${SHAPES[shape]}، ${people(seats)}`;
  $("t-size").textContent = ok ? sizeTxt(shape, L, W) : "راجع المقاس";
  $("t-top").textContent = TOPS[val("top")][0];
  $("t-base").textContent = val("base") + (chairs ? "، مع كراسي" : "");
  $("len-label").textContent = shape === "round" ? "القطر" : shape === "square" ? "طول الضلع" : "الطول";
  $("wid-wrap").hidden = one;
}

form.addEventListener("change", (e) => {
  if (e.target.name === "shape") syncSeats(val("shape"));
  if (e.target.name === "shape" || e.target.name === "seats") applySuggested();
  draw();
});
// Typing: redraw only valid values, stay quiet. Leaving the field (change): show the error.
form.addEventListener("input", (e) => { if (e.target.type === "number") draw(false); });

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const d = readDims();
  if (!d.ok) { $("len").focus(); return; }
  const city = $("city").value.trim();
  const notes = $("notes").value.trim();
  const lines = [
    "السلام عليكم، صممت طاولة من موقعكم:",
    `الشكل: ${SHAPES[val("shape")]}`,
    `عدد الأشخاص: ${people(+val("seats"))}`,
    `المقاس: ${sizeTxt(val("shape"), d.l, d.w)}`,
    `السطح: ${TOPS[val("top")][0]}`,
    `القاعدة: ${val("base")}`,
    `الكراسي: ${val("chairs") === "yes" ? `مع ${chairsTxt(+val("seats"))}` : "الطاولة فقط"}`,
  ];
  if (city) lines.push(`المدينة: ${city}`);
  if (notes) lines.push(`ملاحظات: ${notes}`);
  lines.push("", "أبغى أعرف السعر ومدة التنفيذ.");
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
});

// Catalogue rows: each asks for photos of that type on WhatsApp.
document.querySelectorAll("[data-ask]").forEach((a) => {
  a.href = `https://wa.me/${WA}?text=${encodeURIComponent(`السلام عليكم، أبغى أشوف صور موديلات ${a.dataset.ask} المتوفرة عندكم.`)}`;
});

// Poster-only hero when the loop video is missing.
const v = document.querySelector(".hero-video");
v.addEventListener("error", () => v.remove(), true);

syncSeats(val("shape"));
applySuggested();
draw();
