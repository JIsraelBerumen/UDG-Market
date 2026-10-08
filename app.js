/* ---------- Cambio de vista ---------- */
const catBg = getComputedStyle(document.documentElement).getPropertyValue('--cat-bg').trim();
const VIEWS = {
  ubereats: { el: document.getElementById('view-ubereats'), bg: '#F8FAFC' },
  catalog:  { el: document.getElementById('view-catalog'),  bg: catBg },
  swipe:    { el: document.getElementById('view-swipe'),    bg: '#F8FAFC' }
};

function switchTab(name) {
  for (const [key, v] of Object.entries(VIEWS)) v.el.classList.toggle('hidden', key !== name);

  document.querySelectorAll('.tab-desktop').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('bg-white', on); b.classList.toggle('text-brand-navy', on); b.classList.toggle('shadow-sm', on);
    b.classList.toggle('text-slate-500', !on);
  });
  document.querySelectorAll('.tab-mobile').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('text-brand-orange', on); b.classList.toggle('text-slate-400', !on);
  });

  document.body.style.backgroundColor = VIEWS[name].bg;
  if (name === 'catalog') loadLazyImages();
  window.scrollTo({ top: 0 });
}
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

/* ---------- Imágenes diferidas con fallback ---------- */
function loadLazyImages() {
  document.querySelectorAll('img[data-src]').forEach(img => {
    img.src = img.dataset.src; img.removeAttribute('data-src');
    img.onerror = () => { img.style.visibility = 'hidden'; };
  });
}

/* ---------- Swipe deck ---------- */
const deck = [
  { title:'Brownies de Sofi',       price:'$35',  unit:'MXN / pieza', rating:'4.9', desc:'Chocolate intenso, centro suave y hechos en casa. El antojo perfecto entre clases.', seller:'Sofía M. · CUCEA', initials:'SM', img:'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=75' },
  { title:'Calculadora científica', price:'$180', unit:'MXN',         rating:'4.7', desc:'Casi nueva, perfecta para cálculo y física. Incluye tapa y pilas nuevas.', seller:'Andrés L. · CUCEI', initials:'AL', img:'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=900&q=75' },
  { title:'Latte para llevar',      price:'$40',  unit:'MXN / vaso',  rating:'4.8', desc:'Café de especialidad preparado al momento. Pásalo a recoger antes de tu clase.', seller:'Alex V. · CUCEA', initials:'AV', img:'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=75' },
  { title:'Sudadera lavanda',       price:'$150', unit:'MXN',         rating:'4.6', desc:'Talla M, súper suave y en excelente estado. Segunda vida para tu clóset.', seller:'Mariana C. · CUAAD', initials:'MC', img:'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=75' }
];
let idx = 0, saved = 0; const history = [];
const $ = id => document.getElementById(id);

function renderCard(animate = true) {
  const c = deck[idx];
  $('sw-img').src = c.img; $('sw-img').alt = c.title;
  $('sw-title').textContent = c.title; $('sw-price').textContent = c.price; $('sw-unit').textContent = c.unit;
  $('sw-rating').textContent = c.rating; $('sw-desc').textContent = c.desc;
  $('sw-seller').textContent = c.seller; $('sw-avatar').textContent = c.initials;
  $('sw-count').textContent = `${idx + 1} de ${deck.length}`;
  if (animate) { const card = $('swipe-card'); card.classList.remove('card-in'); void card.offsetWidth; card.classList.add('card-in'); }
}
function next(action) {
  history.push({ idx, action });
  if (action === 'save') { saved++; $('toast-text').textContent = `Guardaste "${deck[idx].title}". Míralo en Guardados.`; }
  idx = (idx + 1) % deck.length; renderCard();
}
$('btn-pass').addEventListener('click', () => next('pass'));
$('btn-save').addEventListener('click', () => next('save'));
$('btn-back').addEventListener('click', () => {
  const last = history.pop(); if (!last) return;
  idx = last.idx; if (last.action === 'save') saved--;
  $('toast-text').textContent = saved ? `${saved} favorito${saved > 1 ? 's' : ''} te espera${saved > 1 ? 'n' : ''} en Guardados.` : 'Tus favoritos te esperan en Guardados.';
  renderCard();
});
/* Teclado en escritorio: ← pasar, → guardar, ↑ volver (solo en la vista Match) */
document.addEventListener('keydown', e => {
  if (VIEWS.swipe.el.classList.contains('hidden') || e.target.matches('input')) return;
  if (e.key === 'ArrowLeft') next('pass');
  else if (e.key === 'ArrowRight') next('save');
  else if (e.key === 'ArrowUp') $('btn-back').click();
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
renderCard(false);
switchTab('ubereats');
