/* ---------- Cambio de vista ---------- */
const catBg = getComputedStyle(document.documentElement).getPropertyValue('--cat-bg').trim();
const VIEWS = {
  ubereats:          { el: document.getElementById('view-ubereats'),        bg: '#F8FAFC' },
  catalog:           { el: document.getElementById('view-catalog'),         bg: catBg },
  swipe:             { el: document.getElementById('view-swipe'),           bg: '#F8FAFC' },
  'seller-orders':   { el: document.getElementById('view-seller-orders'),   bg: '#F8FAFC' },
  profile:           { el: document.getElementById('view-profile'),         bg: '#F8FAFC' },
  'editar-producto': { el: document.getElementById('view-editar-producto'), bg: '#F8FAFC' }
};

function switchTab(name) {
  if (name === 'dashboard') name = 'ubereats';
  if (name === 'match' || name === 'tinder') name = 'swipe';
  if (name === 'seller-orders' && !isSellerModeEnabled()) name = 'ubereats';

  for (const [key, v] of Object.entries(VIEWS)) {
    if (v.el) v.el.classList.toggle('hidden', key !== name);
  }

  // En modo vendedor, perfil o editar producto, ocultamos la barra y cabecera del comprador
  const buyerHeader = document.getElementById('main-header');
  const buyerBottomNav = document.getElementById('main-bottom-nav');
  const hideBuyerChrome = (name === 'seller-orders' || name === 'profile' || name === 'editar-producto');
  if (buyerHeader) buyerHeader.classList.toggle('hidden', hideBuyerChrome);
  if (buyerBottomNav) buyerBottomNav.classList.toggle('hidden', hideBuyerChrome);

  document.querySelectorAll('.tab-desktop').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('bg-white', on); b.classList.toggle('text-brand-navy', on); b.classList.toggle('shadow-sm', on);
    b.classList.toggle('text-slate-500', !on);
  });
  document.querySelectorAll('.tab-mobile').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('text-brand-orange', on); b.classList.toggle('text-slate-400', !on);
  });

  if (VIEWS[name]) {
    document.body.style.backgroundColor = VIEWS[name].bg;
  }
  if (name === 'catalog') loadLazyImages();
  window.scrollTo({ top: 0 });
}

window.switchView = switchTab;
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

/* ---------- Imágenes diferidas con fallback ---------- */
function loadLazyImages() {
  document.querySelectorAll('img[data-src]').forEach(img => {
    img.src = img.dataset.src; img.removeAttribute('data-src');
    img.onerror = () => { img.style.visibility = 'hidden'; };
  });
}

const $ = id => document.getElementById(id);

/* ========================================== */
/* P6: MÓDULO DESCUBRIMIENTO / MATCH (TINDER) */
/* ========================================== */
/* Los campos rating, desc y unit se añadieron para alimentar el diseño original de la tarjeta. */
const tinderCards = [
  {
    title: "Rebanada Pastel Chocolate",
    seller: "Valeria Gómez (Derecho)",
    price: "$35",
    unit: "MXN / rebanada",
    rating: "4.9",
    desc: "Rebanada de pastel de chocolate casero, esponjosa y con betún suave. Ideal para el descanso.",
    time: "Disponible hasta las 3:00 PM",
    location: "Canchas CUCEI",
    img: "https://images.unsplash.com/photo-1578985545062-69928b1b9587?auto=format&fit=crop&w=800&q=80",
    hasActiveRange: true,
    range: "11:00 AM - 3:00 PM"
  },
  {
    title: "Orden Tacos Guisado (3x)",
    seller: "Carlos (Ingeniería)",
    price: "$40",
    unit: "MXN / orden",
    rating: "4.8",
    desc: "Tres tacos de guisado recién hechos con tortilla a mano. Pásate en tu rato libre.",
    time: "Rato libre: 1:00 PM - 2:00 PM",
    location: "Módulo O",
    img: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
    hasActiveRange: false,
    range: ""
  }
];

let currentTinderIndex = 0;
const tinderHistory = [];          /* índices vistos, para "Volver" */
const likedCards = new Set();      /* índices guardados */
let tinderBusy = false;            /* evita doble toque durante la animación */
let advanceAfterModal = false;     /* tras guardar y cerrar el modal, pasa a la siguiente */
let lastAppt = {};                 /* datos de la cita abierta en el modal */

function initialsOf(seller) {
  const words = seller.split('(')[0].trim().split(/\s+/);
  return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase();
}

function updateToast() {
  const n = likedCards.size;
  $('toast-text').textContent = n
    ? `${n} favorito${n > 1 ? 's' : ''} te espera${n > 1 ? 'n' : ''} en Guardados.`
    : 'Tus favoritos te esperan en Guardados.';
}

function renderTinderCard(animate = true) {
  const c = tinderCards[currentTinderIndex];
  $('sw-img').src = c.img; $('sw-img').alt = c.title;
  $('sw-title').textContent = c.title;
  $('sw-price').textContent = c.price;
  $('sw-unit').textContent = c.unit || 'MXN';
  $('sw-rating').textContent = c.rating || '–';
  $('sw-desc').textContent = c.desc || c.time;
  $('sw-seller').textContent = c.seller;
  $('sw-avatar').textContent = initialsOf(c.seller);
  $('sw-location').textContent = c.location;
  $('sw-badge').textContent = c.hasActiveRange ? 'Disponible hoy' : 'Rato libre';
  $('sw-count').textContent = `${currentTinderIndex + 1} de ${tinderCards.length}`;
  if (animate) { const el = $('swipe-card'); el.classList.remove('card-in'); void el.offsetWidth; el.classList.add('card-in'); }
}

function swipeCard(direction) {
  if (tinderBusy) return;
  tinderBusy = true;
  const cardEl = $('swipe-card');
  cardEl.classList.add(direction === 'left' ? 'swipe-left' : 'swipe-right');

  setTimeout(() => {
    tinderHistory.push(currentTinderIndex);
    currentTinderIndex = (currentTinderIndex + 1) % tinderCards.length;
    renderTinderCard(false);

    /* devuelve la tarjeta a su sitio sin animar el regreso */
    cardEl.style.transition = 'none';
    cardEl.classList.remove('swipe-left', 'swipe-right');
    void cardEl.offsetWidth;
    cardEl.style.transition = '';
    cardEl.classList.remove('card-in'); void cardEl.offsetWidth; cardEl.classList.add('card-in');
    tinderBusy = false;
  }, 300);
}

function likeAndTriggerAppointment() {
  const card = tinderCards[currentTinderIndex];
  likedCards.add(currentTinderIndex);
  $('toast-text').textContent = `Guardaste "${card.title}". Míralo en Guardados.`;
  advanceAfterModal = true;
  openAppointmentModal(card.seller, card.title, card.price, card.location, card.hasActiveRange, card.range);
}

/* Tocar la imagen solo abre el punto de venta / cita; no guarda ni avanza */
function triggerTinderAppointment() {
  const card = tinderCards[currentTinderIndex];
  advanceAfterModal = false;
  openAppointmentModal(card.seller, card.title, card.price, card.location, card.hasActiveRange, card.range);
}

function tinderGoBack() {
  if (tinderBusy || !tinderHistory.length) return;
  currentTinderIndex = tinderHistory.pop();
  likedCards.delete(currentTinderIndex);
  updateToast();
  renderTinderCard();
}

$('btn-pass').addEventListener('click', () => swipeCard('left'));
$('btn-save').addEventListener('click', likeAndTriggerAppointment);
$('btn-back').addEventListener('click', tinderGoBack);

/* Teclado en escritorio: ← pasar, → guardar, ↑ volver (solo en la vista Match y sin modal abierto) */
document.addEventListener('keydown', e => {
  if (VIEWS.swipe.el.classList.contains('hidden') || !$('appt-modal').classList.contains('hidden') || e.target.matches('input')) return;
  if (e.key === 'ArrowLeft') swipeCard('left');
  else if (e.key === 'ArrowRight') likeAndTriggerAppointment();
  else if (e.key === 'ArrowUp') tinderGoBack();
});

/* ---------- Modal de cita ---------- */
function openAppointmentModal(seller, title, price, location, hasActiveRange, range) {
  $('appt-title').textContent = title;
  $('appt-seller').textContent = seller;
  $('appt-location').textContent = location;
  $('appt-price').textContent = price;
  lastAppt = { seller, title, price, location, hasActiveRange, range };
  $('appt-range').textContent = hasActiveRange
    ? `Horario de entrega: ${range}`
    : 'El vendedor no tiene horario fijo: propón una hora';
  $('appt-time').value = '';
  $('appt-done').classList.add('hidden');
  const m = $('appt-modal');
  m.classList.remove('hidden'); m.classList.add('flex');
}
/* "14:30" → "2:30 PM" */
function formatTime12(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function closeAppointmentModal() {
  const m = $('appt-modal');
  if (m.classList.contains('hidden')) return;
  m.classList.add('hidden'); m.classList.remove('flex');
  if (advanceAfterModal) { advanceAfterModal = false; swipeCard('right'); }
}
$('appt-close').addEventListener('click', closeAppointmentModal);
$('appt-modal').addEventListener('click', e => { if (e.target.id === 'appt-modal') closeAppointmentModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAppointmentModal(); });
$('appt-confirm').addEventListener('click', () => {
  const t = $('appt-time').value;
  if (!t) { $('appt-time').focus(); return; }
  $('appt-done').textContent = `¡Cita agendada a las ${t}!`;
  $('appt-done').classList.remove('hidden');
  setTimeout(() => {
    advanceAfterModal = false; /* nos vamos de la página: no avanzar tarjeta */
    const hora12 = formatTime12(t);
    const params = new URLSearchParams({
      producto: lastAppt.title,
      vendedor: lastAppt.seller,
      lugar:    lastAppt.location,
      ref:      lastAppt.hasActiveRange ? `Horario del vendedor: ${lastAppt.range}` : 'Confirma con el vendedor al llegar',
      hora:     hora12,
      total:    String(lastAppt.price).replace(/[^\d.]/g, '')
    });
    showReservation(Object.fromEntries(params));
  }, 900);
});

/* ---------- Chips y favoritos ---------- */
const ON = ['bg-brand-navy','text-white','border-brand-navy'], OFF = ['bg-white','text-brand-navy','border-slate-200'];
$('swipe-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip'); if (!chip) return;
  document.querySelectorAll('#swipe-chips .chip').forEach(c => { c.classList.remove(...ON); c.classList.add(...OFF); });
  chip.classList.remove(...OFF); chip.classList.add(...ON);
});
document.querySelectorAll('.fav').forEach(b => b.addEventListener('click', () => b.classList.toggle('fav-on')));

/* ---------- Init ---------- */
renderTinderCard(false);
/* Permite abrir una pestaña directo: index.html#swipe, #catalog */
const startTab = location.hash.slice(1);
switchTab(VIEWS[startTab] ? startTab : 'ubereats');
window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (VIEWS[h]) switchTab(h);
});

/* ========================================== */
/* US-14: FILTROS DE BÚSQUEDA DEL CATÁLOGO    */
/* ========================================== */
const FILTER_KEY = 'udg-market-filters';
const FILTER_GROUPS = [
  { key: 'tipo', title: 'Tipo de comida', hint: 'Elige varios', multi: true, opts: [
    ['postres', 'Postres', 'fa-cookie-bite'], ['rapida', 'Comida rápida', 'fa-burger'], ['bebidas', 'Bebidas', 'fa-mug-hot'],
    ['snacks', 'Snacks', 'fa-cookie'], ['saludable', 'Saludable', 'fa-leaf'], ['guisados', 'Guisados', 'fa-bowl-food'] ] },
  { key: 'ubi', title: 'Ubicación', hint: 'Dónde entregan', multi: true, opts: [
    ['canchas', 'Canchas', 'fa-location-dot'], ['biblioteca', 'Biblioteca', 'fa-location-dot'], ['cafeteria', 'Cafetería', 'fa-location-dot'],
    ['ingenieria', 'Ingeniería', 'fa-location-dot'], ['entrada', 'Entrada principal', 'fa-location-dot'] ] },
  { key: 'precio', title: 'Precio', hint: 'MXN · elige uno', multi: false, opts: [
    ['0-30', 'Hasta $30'], ['30-60', '$30 – $60'], ['60-100', '$60 – $100'], ['100-', 'Más de $100'] ] }
];
/* Datos de filtrado de cada tarjeta del catálogo, en el mismo orden que aparecen en la página.
   tipo: null = no es comida (se oculta si eliges un tipo de comida). */
const CATALOG_META = [
  { tipo: 'postres', ubi: 'canchas',    price: 35,  now: true  },  /* Brownies de Sofi */
  { tipo: 'rapida',  ubi: 'cafeteria',  price: 55,  now: true  },  /* Entre panes */
  { tipo: 'postres', ubi: 'ingenieria', price: 20,  now: true  },  /* Galletas de Marcos */
  { tipo: null,      ubi: 'biblioteca', price: 180, now: false },  /* Calculadora científica */
  { tipo: null,      ubi: 'entrada',    price: 150, now: false },  /* Sudadera lavanda */
  { tipo: null,      ubi: 'biblioteca', price: 90,  now: false },  /* Libros de economía */
  { tipo: 'bebidas', ubi: 'cafeteria',  price: 40,  now: true  }   /* Latte para llevar */
];
const catItems = [...document.querySelectorAll('#view-catalog article')].map((el, i) => ({ el, ...(CATALOG_META[i] || {}) }));
const emptyFilters = () => ({ tipo: new Set(), ubi: new Set(), precio: new Set(), now: false });
let appliedFilters = emptyFilters();
let draftFilters = emptyFilters();

function loadFilters() {
  try {
    const s = JSON.parse(localStorage.getItem(FILTER_KEY));
    if (s) return { tipo: new Set(s.tipo), ubi: new Set(s.ubi), precio: new Set(s.precio), now: !!s.now };
  } catch {}
  return emptyFilters();
}
const filterCount = f => f.tipo.size + f.ubi.size + f.precio.size + (f.now ? 1 : 0);
const copyFilters = f => ({ tipo: new Set(f.tipo), ubi: new Set(f.ubi), precio: new Set(f.precio), now: f.now });
function inPriceRange(p, r) { const [a, b] = r.split('-'); return p >= +a && (b === '' || p <= +b); }
function itemPasses(it, f) {
  if (it.price === undefined) return true; /* tarjetas sin datos no se filtran */
  return (!f.tipo.size   || f.tipo.has(it.tipo)) &&
         (!f.ubi.size    || f.ubi.has(it.ubi)) &&
         (!f.precio.size || [...f.precio].some(r => inPriceRange(it.price, r))) &&
         (!f.now || it.now);
}
const countMatches = f => catItems.filter(it => itemPasses(it, f)).length;

/* Aplica los filtros a las tarjetas del catálogo */
function applyCatalogFilter() {
  catItems.forEach(it => it.el.classList.toggle('hidden', !itemPasses(it, appliedFilters)));
  document.querySelectorAll('#view-catalog section.mt-8').forEach(sec => {
    if (!sec.querySelector('article')) return;
    sec.classList.toggle('hidden', ![...sec.querySelectorAll('article')].some(a => !a.classList.contains('hidden')));
  });
  $('cat-empty').classList.toggle('hidden', countMatches(appliedFilters) > 0);
  const n = filterCount(appliedFilters), badge = $('filter-badge');
  badge.textContent = n; badge.classList.toggle('hidden', n === 0); badge.classList.toggle('grid', n > 0);
}

/* Construye el contenido de la hoja de filtros (una sola vez) */
const F_ON  = ['bg-brand-navy', 'text-white', 'border-brand-navy'];
const F_OFF = ['bg-white', 'text-brand-navy', 'border-slate-200', 'hover:border-slate-400'];
$('fs-body').innerHTML = FILTER_GROUPS.map(g => `
  <section aria-label="${g.title}">
    <div class="flex items-baseline justify-between mb-3"><h3 class="text-lg font-extrabold text-brand-navy">${g.title}</h3><span class="text-xs text-slate-500">${g.hint}</span></div>
    <div data-group="${g.key}" class="flex flex-wrap gap-2.5">
      ${g.opts.map(([v, label, icon]) => `<button type="button" data-v="${v}" aria-pressed="false" class="fchip h-12 px-5 rounded-full border text-sm font-semibold transition">${icon ? `<i class="fa-solid ${icon} mr-2"></i>` : ''}${label}</button>`).join('')}
    </div>
  </section>`).join('') + `
  <section class="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 min-h-[64px] flex items-center justify-between gap-4">
    <div><p id="fs-now-label" class="font-bold text-brand-navy">Disponible ahora</p><p class="text-xs text-slate-500">Solo vendedores activos hoy</p></div>
    <button id="fs-now" type="button" role="switch" aria-checked="false" aria-labelledby="fs-now-label" class="relative shrink-0 w-16 h-9 rounded-full bg-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint focus-visible:ring-offset-2"><span id="fs-now-knob" class="absolute top-1 left-1 w-7 h-7 rounded-full bg-white shadow transition-transform"></span></button>
  </section>`;

function renderFilterSheet() {
  document.querySelectorAll('#fs-body [data-group]').forEach(box => {
    box.querySelectorAll('.fchip').forEach(c => {
      const on = draftFilters[box.dataset.group].has(c.dataset.v);
      c.classList.remove(...F_ON, ...F_OFF); c.classList.add(...(on ? F_ON : F_OFF));
      c.setAttribute('aria-pressed', on);
    });
  });
  const n = countMatches(draftFilters), active = filterCount(draftFilters);
  $('fs-apply').disabled = n === 0;
  $('fs-apply').textContent = n === 0 ? 'Sin resultados' : `Mostrar ${n} resultado${n === 1 ? '' : 's'}`;
  $('fs-clear').disabled = active === 0;
  $('fs-clear').textContent = active ? `Limpiar filtros (${active})` : 'Limpiar filtros';
  $('fs-now').setAttribute('aria-checked', draftFilters.now);
  $('fs-now').classList.toggle('bg-brand-mint', draftFilters.now); $('fs-now').classList.toggle('bg-slate-300', !draftFilters.now);
  $('fs-now-knob').classList.toggle('translate-x-7', draftFilters.now);
}
function openFilterSheet() {
  draftFilters = copyFilters(appliedFilters); renderFilterSheet();
  const s = $('filter-sheet'); s.classList.remove('hidden'); s.classList.add('flex');
  document.body.style.overflow = 'hidden'; $('fs-body').scrollTop = 0;
}
function closeFilterSheet() {
  const s = $('filter-sheet'); if (s.classList.contains('hidden')) return;
  s.classList.add('hidden'); s.classList.remove('flex'); document.body.style.overflow = '';
}
function clearAllFilters() { appliedFilters = emptyFilters(); draftFilters = emptyFilters(); saveFilters(); applyCatalogFilter(); }
function saveFilters() {
  localStorage.setItem(FILTER_KEY, JSON.stringify({ tipo: [...appliedFilters.tipo], ubi: [...appliedFilters.ubi], precio: [...appliedFilters.precio], now: appliedFilters.now }));
}

$('open-filters').addEventListener('click', openFilterSheet);
$('fs-close').addEventListener('click', closeFilterSheet);
$('filter-sheet').addEventListener('click', e => { if (e.target.id === 'filter-sheet') closeFilterSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFilterSheet(); });
$('fs-body').addEventListener('click', e => {
  const chip = e.target.closest('.fchip');
  if (chip) {
    const key = chip.closest('[data-group]').dataset.group, v = chip.dataset.v;
    const multi = FILTER_GROUPS.find(g => g.key === key).multi;
    if (draftFilters[key].has(v)) draftFilters[key].delete(v);
    else { if (!multi) draftFilters[key].clear(); draftFilters[key].add(v); }
    renderFilterSheet(); return;
  }
  if (e.target.closest('#fs-now')) { draftFilters.now = !draftFilters.now; renderFilterSheet(); }
});
$('fs-clear').addEventListener('click', () => { draftFilters = emptyFilters(); renderFilterSheet(); });
$('fs-apply').addEventListener('click', () => { appliedFilters = copyFilters(draftFilters); saveFilters(); applyCatalogFilter(); closeFilterSheet(); window.scrollTo({ top: 0 }); });
$('cat-empty-clear').addEventListener('click', clearAllFilters);

/* Restaura los filtros guardados al cargar */
appliedFilters = loadFilters();
applyCatalogFilter();

/* ========================================== */
/* US-20: RESERVA CONFIRMADA                  */
/* ========================================== */
function showReservation(d) {
  if (!d.codigo) d.codigo = '#UDG-' + String(Math.floor(1000 + Math.random() * 9000));
  $('rv-time').textContent = d.hora;
  $('rv-place').textContent = d.lugar; $('rv-place2').textContent = d.lugar;
  $('rv-ref').textContent = d.ref || '';
  $('rv-product').textContent = d.producto;
  $('rv-seller').textContent = d.vendedor;
  $('rv-code').textContent = d.codigo;
  $('rv-total').textContent = '$' + String(d.total).replace(/[^\d.]/g, '');
  closeAppointmentModal();
  $('reserva-view').classList.remove('hidden'); $('reserva-view').scrollTop = 0;
  document.body.style.overflow = 'hidden';
  history.replaceState(null, '', 'index.html?' + new URLSearchParams(d).toString()); /* recargar mantiene la confirmación */
}
function hideReservation() {
  $('reserva-view').classList.add('hidden');
  document.body.style.overflow = '';
  history.replaceState(null, '', 'index.html');
  switchTab('ubereats');
}
$('rv-home').addEventListener('click', hideReservation);

/* Si llegas a index.html con los datos de una reserva en la URL, se muestra la confirmación */
(function () {
  const p = new URLSearchParams(location.search);
  if (p.get('producto') && p.get('hora') && p.get('lugar')) showReservation(Object.fromEntries(p));
})();

/* ========================================== */
/* Catálogo → Detalle del producto (US-15)    */
/* ========================================== */
/* El id es la posición de la tarjeta en el catálogo (0–6) y coincide con PRODUCTS en producto.html */
catItems.forEach((it, i) => {
  const go = () => {
    const inPages = /\/pages\/[^/]*$/i.test(location.pathname.replace(/\\/g, '/'));
    location.href = `${inPages ? '' : 'pages/'}producto.html?id=${i}`;
  };
  it.el.classList.add('cursor-pointer', 'hover:-translate-y-0.5', 'transition');
  it.el.setAttribute('role', 'link');
  it.el.setAttribute('tabindex', '0');
  const name = it.el.querySelector('h3')?.textContent.trim();
  if (name) it.el.setAttribute('aria-label', `Ver detalle de ${name}`);
  it.el.addEventListener('click', e => { if (e.target.closest('.fav')) return; go(); }); /* el corazón no abre el detalle */
  it.el.addEventListener('keydown', e => {
    if (e.target !== it.el) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
  });
});

/* ========================================== */
/* MODO VENDEDOR (Gestión de Pedidos Activos) */
/* ========================================== */

// Alternar estado de la tienda (Recibiendo pedidos vs En Clase/Pausado)
function toggleStoreStatus(checkbox) {
  const statusText = document.getElementById('status-text');
  const toggleLabel = document.querySelector('.toggle-label');
  
  if (checkbox.checked) {
    statusText.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-mint animate-ping inline-block"></span>
      Recibiendo
    `;
    statusText.className = "text-[11px] font-bold text-mint tracking-tight flex items-center gap-1.5";
    toggleLabel.style.backgroundColor = '#228276';
    showToast('Modo Activo', 'Tu tienda está recibiendo nuevos pedidos.');
  } else {
    statusText.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-terracota inline-block"></span>
      En Clase
    `;
    statusText.className = "text-[11px] font-bold text-terracota tracking-tight flex items-center gap-1.5";
    toggleLabel.style.backgroundColor = '#637080';
    showToast('Modo Pausado', 'No recibirás nuevos pedidos mientras estás en clase.');
  }
}

// Heurística de Nielsen: Feedback inmediato al marcar entregado
function markDelivered(button, clientName) {
  const card = button.closest('article');
  
  // Animación suave de confirmación
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
  button.disabled = true;

  setTimeout(() => {
    card.style.transition = 'all 0.4s ease';
    card.style.opacity = '0.4';
    card.style.transform = 'scale(0.96)';
    card.classList.add('pointer-events-none');
    
    button.innerHTML = '<i class="fa-solid fa-check-double"></i> ¡Entregado!';
    button.className = "flex-1 h-11 rounded-xl bg-gray-400 text-white font-extrabold text-sm flex items-center justify-center gap-2";

    showToast('¡Entrega Confirmada!', `Pedido de ${clientName} marcado como entregado.`);
  }, 500);
}

/* ========================================== */
/* MI PERFIL / AJUSTES & TOAST GLOBAL UNIFICADO */
/* ========================================== */

/**
 * Gestión del modal de Edición de Perfil y Centro Universitario
 */
const editModal = document.getElementById('edit-profile-modal');
const modalContent = document.getElementById('modal-content-card');

function openEditModal() {
  if (!editModal) return;
  editModal.classList.remove('hidden');
  // Forzar reflujo para activar transición fluida
  requestAnimationFrame(() => {
    editModal.classList.remove('opacity-0');
    editModal.classList.add('opacity-100');
    if (modalContent) {
      modalContent.classList.remove('translate-y-full');
      modalContent.classList.add('translate-y-0');
    }
  });
  // Sincronizar campos del formulario con los valores mostrados en tarjeta
  const nameCard = document.getElementById('profile-card-name');
  const academicCard = document.getElementById('profile-card-academic');
  const codeCard = document.getElementById('profile-card-code');
  const avatarImg = document.getElementById('profile-card-avatar');
  const modalAvatar = document.getElementById('modal-avatar-preview');

  if (nameCard) document.getElementById('input-name').value = nameCard.innerText.trim();
  if (codeCard) document.getElementById('input-code').value = codeCard.innerText.trim();
  if (avatarImg && modalAvatar) modalAvatar.src = avatarImg.src;

  if (academicCard) {
    const parts = academicCard.innerText.split('•');
    if (parts.length >= 2) {
      document.getElementById('input-career').value = parts[0].trim();
      const campusVal = parts[1].trim();
      const selectCampus = document.getElementById('select-campus');
      if (selectCampus) {
        for (let i = 0; i < selectCampus.options.length; i++) {
          if (selectCampus.options[i].value === campusVal || selectCampus.options[i].text.includes(campusVal)) {
            selectCampus.selectedIndex = i;
            break;
          }
        }
      }
    }
  }
}

function closeEditModal() {
  if (!editModal) return;
  if (modalContent) {
    modalContent.classList.remove('translate-y-0');
    modalContent.classList.add('translate-y-full');
  }
  editModal.classList.remove('opacity-100');
  editModal.classList.add('opacity-0');
  setTimeout(() => {
    editModal.classList.add('hidden');
  }, 300);
}

// Selección rápida de avatares preset
function selectPresetAvatar(url) {
  const modalPreview = document.getElementById('modal-avatar-preview');
  if (modalPreview) {
    modalPreview.src = url;
  }
}

function triggerFileUpload() {
  const fileInput = document.getElementById('avatar-file-input');
  if (fileInput) fileInput.click();
}

function handleAvatarFileSelect(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const modalPreview = document.getElementById('modal-avatar-preview');
      if (modalPreview) {
        modalPreview.src = e.target.result;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// Guardado de cambios de perfil en DOM
function saveProfileChanges(e) {
  e.preventDefault();
  const newName = document.getElementById('input-name').value.trim();
  const newCampus = document.getElementById('select-campus').value;
  const newCareer = document.getElementById('input-career').value.trim();
  const newCode = document.getElementById('input-code').value.trim();
  const modalPreview = document.getElementById('modal-avatar-preview');

  // Actualizar vista de la tarjeta de perfil
  const cardName = document.getElementById('profile-card-name');
  const cardAcademic = document.getElementById('profile-card-academic');
  const cardCode = document.getElementById('profile-card-code');
  const cardAvatar = document.getElementById('profile-card-avatar');
  const hintCampus = document.getElementById('seller-hint-campus');
  const footerCampus = document.getElementById('footer-campus-text');

  if (cardName && newName) cardName.innerText = newName;
  if (cardAcademic) cardAcademic.innerText = `${newCareer} • ${newCampus}`;
  if (cardCode && newCode) cardCode.innerText = newCode;
  if (cardAvatar && modalPreview) cardAvatar.src = modalPreview.src;
  if (hintCampus) hintCampus.innerText = `Campus ${newCampus}`;
  if (footerCampus) footerCampus.innerText = `UDG Market • Campus ${newCampus}`;

  closeEditModal();
  showToast('Datos de estudiante actualizados correctamente', 'mint', 'fa-circle-check');
}

const SELLER_MODE_KEY = 'udg-market-seller-mode';

function isSellerModeEnabled() {
  try {
    return localStorage.getItem(SELLER_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Sincroniza la visibilidad del Modo Vendedor en la vista principal y en Perfil
 * según el estado guardado en localStorage.
 */
function applySellerModeUI(enabled, animate = false) {
  // 1. Mostrar/ocultar accesos de Modo Vendedor en la vista principal
  document.querySelectorAll('.seller-mode-only').forEach(el => {
    el.classList.toggle('hidden', !enabled);
  });

  // Ajustar columnas de la barra inferior móvil principal (4 sin vendedor, 5 con vendedor)
  const mobileGrid = document.getElementById('main-bottom-nav-grid');
  if (mobileGrid) {
    mobileGrid.classList.toggle('grid-cols-5', enabled);
    mobileGrid.classList.toggle('grid-cols-4', !enabled);
  }

  // 2. Sincronizar el switch y menú condicional dentro de Perfil
  const switchEl = document.getElementById('seller-mode-switch');
  if (switchEl) switchEl.checked = enabled;

  const sellerMenu = document.getElementById('seller-menu');
  const statusBadge = document.getElementById('seller-status-badge');
  const sellerHint = document.getElementById('seller-hint');

  if (sellerMenu) {
    if (enabled) {
      sellerMenu.classList.remove('hidden');
      if (animate) {
        requestAnimationFrame(() => {
          sellerMenu.classList.remove('opacity-0', 'translate-y-2');
          sellerMenu.classList.add('opacity-100', 'translate-y-0');
        });
      } else {
        sellerMenu.classList.remove('opacity-0', 'translate-y-2');
        sellerMenu.classList.add('opacity-100', 'translate-y-0');
      }
    } else if (animate) {
      sellerMenu.classList.remove('opacity-100', 'translate-y-0');
      sellerMenu.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => {
        if (!isSellerModeEnabled()) sellerMenu.classList.add('hidden');
      }, 300);
    } else {
      sellerMenu.classList.remove('opacity-100', 'translate-y-0');
      sellerMenu.classList.add('opacity-0', 'translate-y-2', 'hidden');
    }
  }

  if (statusBadge) {
    statusBadge.textContent = enabled ? 'Activo' : 'Inactivo';
    statusBadge.classList.toggle('bg-mint/15', enabled);
    statusBadge.classList.toggle('text-mint', enabled);
    statusBadge.classList.toggle('bg-slate-100', !enabled);
    statusBadge.classList.toggle('text-slate-500', !enabled);
  }

  if (sellerHint) {
    sellerHint.classList.toggle('hidden', enabled);
  }
}

/**
 * Alterna la visibilidad y transición del menú de vendedor y guarda en localStorage
 * @param {HTMLInputElement} checkbox - Elemento switch
 */
function toggleSellerMode(checkbox) {
  const enabled = Boolean(checkbox && checkbox.checked);
  try {
    localStorage.setItem(SELLER_MODE_KEY, enabled ? 'true' : 'false');
  } catch {}

  applySellerModeUI(enabled, true);

  if (enabled) {
    showToast('Modo Vendedor Activado: Ya visible en el menú principal', 'mint', 'fa-store');
  } else {
    showToast('Modo Vendedor Desactivado: Oculto de la vista principal', 'navy', 'fa-eye-slash');
  }
}

// Restaurar estado del Modo Vendedor al cargar la SPA
applySellerModeUI(isSellerModeEnabled(), false);

/**
 * Sistema Unificado de Toast Global
 * Compatible con:
 * - showToast(message, colorType, iconClass) [desde Perfil]
 * - showToast(title, description) [desde Panel de Vendedor]
 */
let toastTimeout = null;
function showToast(arg1, arg2 = 'mint', arg3 = 'fa-check') {
  const toast = document.getElementById('toast-notification');
  const msg = document.getElementById('toast-message');
  const desc = document.getElementById('toast-desc');
  const iconBox = document.getElementById('toast-icon-box');
  const icon = document.getElementById('toast-icon');

  if (!toast || !msg) return;

  const isColorToken = (arg2 === 'mint' || arg2 === 'terracota' || arg2 === 'navy');
  const colorType = isColorToken ? arg2 : 'mint';
  const iconClass = isColorToken ? arg3 : 'fa-check';

  msg.textContent = arg1;

  if (desc) {
    if (!isColorToken && typeof arg2 === 'string' && arg2.length > 0) {
      desc.textContent = arg2;
      desc.classList.remove('hidden');
    } else {
      desc.textContent = '';
      desc.classList.add('hidden');
    }
  }

  if (icon) {
    icon.className = `fa-solid ${iconClass} text-xs`;
  }

  if (iconBox) {
    if (colorType === 'mint') {
      iconBox.className = 'w-7 h-7 rounded-full bg-mint flex items-center justify-center text-white shrink-0';
    } else if (colorType === 'terracota') {
      iconBox.className = 'w-7 h-7 rounded-full bg-terracota flex items-center justify-center text-white shrink-0';
    } else {
      iconBox.className = 'w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0';
    }
  }

  toast.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
  }, 2800);
}

function handleSaveNotification() {
  openEditModal();
}

function handleLogout() {
  if (confirm('¿Deseas cerrar tu sesión de estudiante en UDG Market?')) {
    showToast('Cerrando sesión...', 'terracota', 'fa-arrow-right-from-bracket');
    if (window.udgAuth && typeof udgAuth.logout === 'function') {
      setTimeout(() => udgAuth.logout(), 900);
    }
  }
}

// ---------- Editar Producto (SPA View) ----------
window.volverAlInventario = function volverAlInventario() {
  const editView = document.getElementById('view-editar-producto');
  if (editView) editView.classList.add('hidden');

  if (document.getElementById('view-inventory')) {
    switchTab('inventory');
  } else {
    const inPages = /\/pages\/[^/]*$/i.test(location.pathname.replace(/\\/g, '/'));
    window.location.href = `${inPages ? '' : 'pages/'}inventario.html`;
  }
};

function initEditProductView() {
  const editView = document.getElementById('view-editar-producto');
  if (!editView) return;

  // Delegación de eventos para stepper (-, +) y chips rápidos (+5, +10, Agotar)
  editView.addEventListener('click', (e) => {
    const stockInput = editView.querySelector('#product-stock');
    if (!stockInput) return;

    const btn = e.target.closest('button');
    if (!btn) return;

    const currentStock = parseInt(stockInput.value, 10) || 0;
    const aria = btn.getAttribute('aria-label') || '';
    const text = btn.textContent.trim();

    if (aria === 'Disminuir stock') {
      if (currentStock > 0) stockInput.value = currentStock - 1;
    } else if (aria === 'Aumentar stock') {
      stockInput.value = currentStock + 1;
    } else if (text === '+5') {
      stockInput.value = currentStock + 5;
    } else if (text === '+10') {
      stockInput.value = currentStock + 10;
    } else if (text.includes('Agotar')) {
      stockInput.value = 0;
    }
  });

  // Delegación de envío del formulario Editar Producto
  editView.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'edit-product-form') {
      e.preventDefault();
      const name = editView.querySelector('#product-name')?.value.trim() || 'Producto';
      showToast(`Cambios guardados en "${name}"`, 'mint', 'fa-circle-check');
    }
  });
}

initEditProductView();
