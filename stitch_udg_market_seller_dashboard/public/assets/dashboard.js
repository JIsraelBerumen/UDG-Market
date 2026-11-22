const $ = (selector) => document.querySelector(selector);
const dashboardState = { user: null, module: null };
const issuedOrderPasses = new Map();

const modules = {
  catalog: { title: 'Productos del campus', path: '/modulos/catalog' },
  inventory: { title: 'Mi inventario', path: '/modulos/inventory' },
  'seller-orders': { title: 'Pedidos activos', path: '/modulos/seller-orders' },
  'buyer-orders': { title: 'Mis pedidos', path: '/modulos/buyer-orders' },
  'cancel-reservation': { title: 'Cancelar reserva', path: '/modulos/cancel-reservation' },
  'edit-product': { title: 'Editar producto', path: '/modulos/edit-product' },
  'inventory-stock': { title: 'Inventario y stock', path: '/modulos/inventory-stock' },
  'inventory-stock-alt': { title: 'Inventario y stock', path: '/modulos/inventory-stock-alt' },
  'delivery-pass': { title: 'Pase de entrega', path: '/modulos/delivery-pass' },
  'post-delivery-review': { title: 'Valorar una compra', path: '/modulos/post-delivery-review' },
  'my-profile': { title: 'Mi perfil', path: '/modulos/my-profile' },
  settings: { title: 'Perfil y ajustes', path: '/modulos/settings' },
  'seller-profile': { title: 'Perfil del vendedor', path: '/modulos/seller-profile' }
};

function showNotice(message, success = false) {
  const notice = $('#global-notice');
  notice.textContent = message;
  notice.classList.toggle('success', Boolean(success));
}

function sellerMode() {
  return Boolean(dashboardState.user) &&
    ['seller', 'both', 'admin'].includes(dashboardState.user.role);
}

function moduleForLegacyLink(url) {
  const hash = url.hash.replace(/^#/, '');
  const hashModules = {
    'seller-orders': 'seller-orders',
    ventas: 'seller-orders',
    inventory: 'inventory',
    inventario: 'inventory',
    profile: 'my-profile',
    perfil: 'my-profile',
    catalog: 'catalog',
    explorar: 'catalog',
    orders: sellerMode() ? 'seller-orders' : 'buyer-orders',
    'buyer-orders': 'buyer-orders',
    'my-profile': 'my-profile'
  };
  if (hashModules[hash]) return hashModules[hash];

  const path = decodeURIComponent(url.pathname).toLowerCase();
  if (path.endsWith('/index.html') || path.endsWith('/producto.html')) {
    return sellerMode() ? 'seller-orders' : 'buyer-orders';
  }
  for (const [module, details] of Object.entries(modules)) {
    if (path === details.path.toLowerCase()) return module;
  }
  return null;
}

function showModule(moduleName, updateHash = true) {
  const module = modules[moduleName];
  if (!module) return;

  dashboardState.module = moduleName;
  $('#screen-title').textContent = module.title;
  $('#module-frame').title = module.title;
  $('#module-frame').src = module.path;
  $('#module-picker').value = moduleName;

  document.querySelectorAll('[data-module-nav]').forEach((button) => {
    if (button.dataset.moduleNav === moduleName) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  if (updateHash && window.location.hash !== `#${moduleName}`) {
    window.location.hash = moduleName;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  let body;
  try {
    body = response.status === 204 ? {} : await response.json();
  } catch (error) {
    throw new Error('El servidor devolvió una respuesta inválida.');
  }
  if (!response.ok) throw new Error(body.error || 'No se pudo completar la solicitud.');
  return body;
}

function profileInitials(user) {
  return (user.fullName || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
}

function setAvatar(doc, imageId, initialsId, user) {
  const image = doc.getElementById(imageId);
  const initials = doc.getElementById(initialsId);
  if (initials) initials.textContent = profileInitials(user);
  if (!image) return;
  if (user.avatarUrl) {
    image.src = user.avatarUrl;
    image.hidden = false;
  } else {
    image.removeAttribute('src');
    image.hidden = true;
  }
}

function hydrateProfileModule(doc) {
  const user = dashboardState.user;
  if (!user) return;

  const campus = user.campusName || user.campusCode || 'Campus no especificado';
  const academic = `${user.career || 'Carrera no especificada'} • ${campus}`;
  const setText = (id, value) => {
    const element = doc.getElementById(id);
    if (element) element.textContent = value;
  };

  setText('profile-card-name', user.fullName);
  setText('profile-card-academic', academic);
  setText('profile-card-email', user.email);
  setText('profile-card-code', user.studentCode || 'No registrado');
  setText('seller-hint-campus', `Campus ${campus}`);
  setText('footer-campus-text', `UDG Market • ${campus}`);
  setText('settings-profile-name', user.fullName);
  setText('settings-profile-academic', academic);
  setText('settings-profile-email', user.email);
  setText('settings-profile-code', user.studentCode || 'No registrado');
  setText('settings-profile-campus', `Campus ${campus}`);
  setText('settings-footer-campus', `UDG Market • ${campus}`);
  setAvatar(doc, 'profile-card-avatar', 'profile-card-initials', user);
  setAvatar(doc, 'modal-avatar-preview', null, user);
  setAvatar(doc, 'settings-profile-avatar', 'settings-profile-initials', user);

  const nameInput = doc.getElementById('input-name');
  const campusInput = doc.getElementById('select-campus');
  const careerInput = doc.getElementById('input-career');
  const codeInput = doc.getElementById('input-code');
  if (nameInput) nameInput.value = user.fullName || '';
  if (campusInput) campusInput.value = user.campusCode || '';
  if (careerInput) careerInput.value = user.career || '';
  if (codeInput) codeInput.value = user.studentCode || '';

  const sellerSwitch = doc.getElementById('seller-mode-switch');
  if (sellerSwitch) {
    const isSeller = ['seller', 'both', 'admin'].includes(user.role);
    sellerSwitch.checked = isSeller;
    const menu = doc.getElementById('seller-menu');
    const hint = doc.getElementById('seller-hint');
    const badge = doc.getElementById('seller-status-badge');
    if (menu) {
      menu.classList.toggle('hidden', !isSeller);
      menu.classList.toggle('opacity-0', !isSeller);
      menu.classList.toggle('translate-y-2', !isSeller);
      menu.classList.toggle('opacity-100', isSeller);
      menu.classList.toggle('translate-y-0', isSeller);
    }
    if (hint) hint.classList.toggle('hidden', isSeller);
    if (badge) {
      badge.textContent = isSeller ? 'Activo' : 'Inactivo';
      badge.classList.toggle('bg-slate-100', !isSeller);
      badge.classList.toggle('text-slate-500', !isSeller);
      badge.classList.toggle('bg-mint/15', isSeller);
      badge.classList.toggle('text-mint', isSeller);
    }
  }
}

function renderSellerReviews(doc, reviews) {
  const container = doc.getElementById('reviews-container');
  if (!container) return;
  container.replaceChildren();
  if (!reviews.length) {
    const empty = doc.createElement('p');
    empty.className = 'bg-white rounded-3xl border border-slate-100 p-4 text-sm text-slate-500';
    empty.textContent = 'Este vendedor aún no tiene reseñas.';
    container.append(empty);
    return;
  }

  for (const review of reviews) {
    const card = doc.createElement('article');
    card.className = 'bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-2.5';
    const header = doc.createElement('div');
    header.className = 'flex items-center justify-between';
    const buyer = doc.createElement('strong');
    buyer.className = 'text-sm font-bold text-slate-800';
    buyer.textContent = review.buyerName;
    const rating = doc.createElement('span');
    rating.className = 'text-xs font-bold text-amber-500';
    rating.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;
    header.append(buyer, rating);
    const date = doc.createElement('p');
    date.className = 'text-[11px] text-slate-400';
    date.textContent = new Date(review.createdAt).toLocaleDateString('es-MX');
    const comment = doc.createElement('p');
    comment.className = 'text-sm text-slate-600';
    comment.textContent = review.comment || 'Sin comentario.';
    const product = doc.createElement('p');
    product.className = 'text-xs font-semibold text-slate-500';
    product.textContent = `Producto: ${review.productName}`;
    card.append(header, date, comment, product);
    container.append(card);
  }
}

function formatOrderDate(value) {
  if (!value) return 'Fecha por definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha por definir';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function orderStatusLabel(status) {
  return {
    pending: 'Pendiente de confirmación',
    confirmed: 'Confirmado',
    ready: 'Listo para entregar',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  }[status] || status;
}

function createOrderCard(doc, order, isSeller) {
  const card = doc.createElement('article');
  card.className = 'rounded-3xl border border-slate-100 bg-white p-4 shadow-sm space-y-3';

  const heading = doc.createElement('div');
  heading.className = 'flex items-start justify-between gap-3';
  const identity = doc.createElement('div');
  const counterpart = doc.createElement('p');
  counterpart.className = 'font-bold text-slate-800';
  counterpart.textContent = isSeller ? order.buyerName : order.sellerName;
  const code = doc.createElement('p');
  code.className = 'text-xs text-slate-500';
  code.textContent = `Pedido ${order.orderCode}`;
  identity.append(counterpart, code);

  const status = doc.createElement('span');
  status.className = 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700';
  status.textContent = orderStatusLabel(order.status);
  heading.append(identity, status);

  const items = doc.createElement('ul');
  items.className = 'space-y-1 text-sm text-slate-600';
  for (const item of order.items) {
    const row = doc.createElement('li');
    row.textContent = `${item.quantity} × ${item.productName}`;
    items.append(row);
  }

  const details = doc.createElement('div');
  details.className = 'flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500';
  const pickup = doc.createElement('span');
  pickup.textContent = `${order.pickupLocation} · ${formatOrderDate(order.pickupAt)}`;
  const total = doc.createElement('strong');
  total.className = 'text-sm font-extrabold text-slate-900';
  total.textContent = `$${Number(order.total).toFixed(2)} MXN`;
  details.append(pickup, total);

  const actions = doc.createElement('div');
  actions.className = 'flex flex-wrap gap-2 border-t border-slate-100 pt-3';
  if (isSeller && order.status === 'pending') {
    actions.append(createOrderAction(doc, order, 'confirm', 'Confirmar venta', 'bg-[#FF7A59] text-[#1E293B]'));
  } else if (isSeller && order.status === 'confirmed') {
    actions.append(createOrderAction(doc, order, 'ready', 'Marcar listo', 'bg-slate-100 text-slate-700'));
    actions.append(createOrderAction(doc, order, 'deliver', 'Validar QR y entregar', 'bg-emerald-600 text-white'));
  } else if (isSeller && order.status === 'ready') {
    actions.append(createOrderAction(doc, order, 'deliver', 'Validar QR y entregar', 'bg-emerald-600 text-white'));
  } else if (!isSeller && ['confirmed', 'ready'].includes(order.status)) {
    actions.append(createOrderAction(doc, order, 'pass', 'Mostrar pase QR', 'bg-[#FF7A59] text-[#1E293B]'));
  } else if (!isSeller && order.status === 'pending') {
    const waiting = doc.createElement('p');
    waiting.className = 'text-xs font-semibold text-slate-500';
    waiting.textContent = 'El pase QR estará disponible cuando el vendedor confirme.';
    actions.append(waiting);
  }
  card.append(heading, items, details, actions);
  return card;
}

function createOrderAction(doc, order, action, label, colors) {
  const button = doc.createElement('button');
  button.type = 'button';
  button.dataset.orderAction = action;
  button.className = `min-h-11 flex-1 rounded-xl px-4 py-2 text-sm font-extrabold transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60 ${colors}`;
  button.textContent = label;
  button.addEventListener('click', () => handleOrderAction(doc, order, action, button));
  return button;
}

function createEmptyOrdersMessage(doc, message) {
  const empty = doc.createElement('div');
  empty.className = 'rounded-3xl border border-slate-100 bg-white px-6 py-12 text-center text-sm text-slate-500';
  empty.textContent = message;
  return empty;
}

async function openOrderPass(doc, order) {
  const key = String(order.id);
  let pass = issuedOrderPasses.get(key);
  if (!pass) {
    const result = await requestJson(`/api/wallet/orders/${encodeURIComponent(order.id)}/pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!result.pass || !result.pass.qrCodeDataUrl || !result.pass.qrToken) {
      throw new Error('El servidor no pudo emitir el pase QR.');
    }
    pass = result.pass;
    issuedOrderPasses.set(key, pass);
  }

  const modal = doc.createElement('div');
  modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'order-pass-title');
  const panel = doc.createElement('section');
  panel.className = 'w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl';
  const title = doc.createElement('h2');
  title.id = 'order-pass-title';
  title.className = 'text-lg font-extrabold text-slate-900';
  title.textContent = 'Pase QR de entrega';
  const code = doc.createElement('p');
  code.className = 'mt-1 text-sm font-bold text-slate-500';
  code.textContent = `Pedido ${pass.orderCode}`;
  const qr = doc.createElement('img');
  qr.className = 'mx-auto mt-4 h-64 w-64 max-w-full rounded-xl border border-slate-200 bg-white p-2';
  qr.src = pass.qrCodeDataUrl;
  qr.alt = `Código QR para entregar el pedido ${pass.orderCode}`;
  const instructions = doc.createElement('p');
  instructions.className = 'mt-3 text-xs leading-relaxed text-slate-500';
  instructions.textContent = 'Muestra este código al vendedor en persona. No lo compartas por chat. Si vuelves a solicitar el pase en otro dispositivo, el código anterior dejará de funcionar.';
  const copy = doc.createElement('button');
  copy.type = 'button';
  copy.className = 'mt-4 min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50';
  copy.textContent = 'Copiar código de respaldo';
  copy.addEventListener('click', async () => {
    try {
      await doc.defaultView.navigator.clipboard.writeText(pass.qrToken);
      showNotice('Código de respaldo copiado. Compártelo solo en persona.');
    } catch (error) {
      showNotice('No se pudo copiar el código. Muestra el QR al vendedor.');
      console.error(error);
    }
  });
  const close = doc.createElement('button');
  close.type = 'button';
  close.className = 'mt-2 min-h-11 w-full rounded-xl bg-[#FF7A59] px-4 py-2 text-sm font-extrabold text-[#1E293B] hover:brightness-95';
  close.textContent = 'Cerrar';
  close.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.remove();
  });
  panel.append(title, code, qr, instructions, copy, close);
  modal.append(panel);
  doc.body.append(modal);
  close.focus();
}

function openOrderQrScanner(doc, order) {
  const view = doc.defaultView;
  const modal = doc.createElement('div');
  modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'qr-scanner-title');
  const panel = doc.createElement('section');
  panel.className = 'w-full max-w-md space-y-3 rounded-3xl bg-white p-5 shadow-2xl';
  const title = doc.createElement('h2');
  title.id = 'qr-scanner-title';
  title.className = 'text-lg font-extrabold text-slate-900';
  title.textContent = `Validar entrega · ${order.orderCode}`;
  const video = doc.createElement('video');
  video.className = 'hidden max-h-64 w-full rounded-2xl bg-slate-950 object-cover';
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  const status = doc.createElement('p');
  status.className = 'text-sm text-slate-600';
  status.setAttribute('role', 'status');
  status.textContent = 'Escanea el pase QR del comprador o ingresa su código de respaldo.';
  const camera = doc.createElement('button');
  camera.type = 'button';
  camera.className = 'min-h-11 w-full rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200';
  camera.textContent = 'Abrir cámara';
  const form = doc.createElement('form');
  form.className = 'flex gap-2';
  const tokenInput = doc.createElement('input');
  tokenInput.className = 'min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm';
  tokenInput.type = 'text';
  tokenInput.autocomplete = 'off';
  tokenInput.placeholder = 'Código de respaldo QR';
  tokenInput.required = true;
  const validate = doc.createElement('button');
  validate.className = 'min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60';
  validate.type = 'submit';
  validate.textContent = 'Validar';
  form.append(tokenInput, validate);
  const close = doc.createElement('button');
  close.className = 'min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50';
  close.type = 'button';
  close.textContent = 'Cancelar';

  let stream = null;
  let scanTimer = null;
  let detector = null;
  let validating = false;
  let closed = false;
  const stopCamera = () => {
    if (scanTimer !== null) view.clearTimeout(scanTimer);
    scanTimer = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    video.classList.add('hidden');
    camera.disabled = false;
    camera.textContent = 'Abrir cámara';
  };
  const closeModal = () => {
    closed = true;
    stopCamera();
    modal.remove();
  };
  const validateToken = async (qrToken) => {
    if (validating || !qrToken) return;
    validating = true;
    validate.disabled = true;
    status.textContent = 'Verificando el pase…';
    try {
      const result = await requestJson('/api/wallet/passes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken })
      });
      if (!result.valid || !result.pass || result.pass.orderCode !== order.orderCode) {
        throw new Error('El QR no corresponde a este pedido.');
      }
      await requestJson(`/api/orders/${encodeURIComponent(order.id)}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
      issuedOrderPasses.delete(String(order.id));
      closeModal();
      showNotice(`QR validado. Pedido ${order.orderCode} marcado como entregado.`);
      try {
        await hydrateOrderModule(doc, 'seller-orders');
      } catch (refreshError) {
        showNotice('Entrega registrada, pero no se pudo actualizar la lista. Recarga Ventas.');
        console.error(refreshError);
      }
    } catch (error) {
      status.textContent = error.message;
      console.error(error);
      validating = false;
      validate.disabled = false;
    }
  };
  const scanFrame = async () => {
    if (closed || !stream || !detector) return;
    try {
      if (video.readyState >= 2) {
        const codes = await detector.detect(video);
        if (codes.length && codes[0].rawValue) {
          await validateToken(codes[0].rawValue);
          if (closed || validating) return;
        }
      }
    } catch (error) {
      status.textContent = 'No se pudo leer el QR con la cámara. Puedes ingresar el código de respaldo.';
      console.error(error);
      stopCamera();
      return;
    }
    scanTimer = view.setTimeout(scanFrame, 250);
  };

  camera.addEventListener('click', async () => {
    if (!view.BarcodeDetector || !view.navigator.mediaDevices ||
        !view.navigator.mediaDevices.getUserMedia) {
      status.textContent = 'Este navegador no permite escanear QR con la cámara. Ingresa el código de respaldo del pase.';
      return;
    }
    camera.disabled = true;
    camera.textContent = 'Solicitando cámara…';
    try {
      detector = new view.BarcodeDetector({ formats: ['qr_code'] });
      stream = await view.navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      video.srcObject = stream;
      video.classList.remove('hidden');
      await video.play();
      camera.textContent = 'Cámara activa';
      status.textContent = 'Apunta la cámara al pase QR del comprador.';
      scanFrame();
    } catch (error) {
      stopCamera();
      status.textContent = `No se pudo abrir la cámara: ${error.message}`;
      console.error(error);
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    validateToken(tokenInput.value.trim());
  });
  close.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  panel.append(title, video, status, camera, form, close);
  modal.append(panel);
  doc.body.append(modal);
  tokenInput.focus();
}

async function handleOrderAction(doc, order, action, button) {
  if (action === 'pass') {
    button.disabled = true;
    try {
      await openOrderPass(doc, order);
    } catch (error) {
      showNotice(error.message);
      console.error(error);
    } finally {
      button.disabled = false;
    }
    return;
  }
  if (action === 'deliver') {
    openOrderQrScanner(doc, order);
    return;
  }

  button.disabled = true;
  const endpoint = action === 'confirm'
    ? 'confirm'
    : 'ready';
  try {
    await requestJson(`/api/orders/${encodeURIComponent(order.id)}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    await hydrateOrderModule(doc, 'seller-orders');
    showNotice(action === 'confirm'
      ? `Venta ${order.orderCode} confirmada.`
      : `Pedido ${order.orderCode} marcado como listo.`);
  } catch (error) {
    button.disabled = false;
    showNotice(error.message);
    console.error(error);
  }
}

async function hydrateOrderModule(doc, moduleName) {
  const isSeller = moduleName === 'seller-orders';
  const { orders } = await requestJson(`/api/orders?as=${isSeller ? 'seller' : 'buyer'}`);
  const activeStatuses = new Set(['pending', 'confirmed', 'ready']);
  const activeOrders = orders.filter((order) => activeStatuses.has(order.status));
  const historyOrders = orders.filter((order) => !activeStatuses.has(order.status));

  if (isSeller) {
    const list = doc.querySelector('main');
    if (!list) return;
    list.replaceChildren(...(activeOrders.length
      ? activeOrders.map((order) => createOrderCard(doc, order, true))
      : [createEmptyOrdersMessage(doc, 'Aún no tienes pedidos de clientes.')]));
    const badge = doc.querySelector('h2 span');
    if (badge) badge.textContent = String(activeOrders.length);
    const navBadge = doc.getElementById('seller-orders-nav-badge');
    if (navBadge) {
      navBadge.textContent = String(activeOrders.length);
      navBadge.classList.toggle('hidden', activeOrders.length === 0);
    }
    const itemCount = doc.getElementById('seller-orders-item-count');
    if (itemCount) {
      itemCount.textContent = String(activeOrders.reduce(
        (sum, order) => sum + order.items.reduce((quantity, item) => quantity + item.quantity, 0),
        0
      ));
    }
    const total = doc.getElementById('seller-orders-total');
    if (total) {
      total.textContent = `$${activeOrders.reduce((sum, order) => sum + Number(order.total), 0).toFixed(2)}`;
    }
    const dateCampus = doc.getElementById('seller-orders-campus-date');
    if (dateCampus) {
      const date = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' }).format(new Date());
      const campus = dashboardState.user.campusName || dashboardState.user.campusCode;
      dateCampus.textContent = `${date}${campus ? ` · Campus ${campus}` : ''}`;
    }
    const title = doc.querySelector('h2');
    if (title) title.firstChild.textContent = 'Pedidos Activos ';
    return;
  }

  const activePanel = doc.getElementById('panel-active');
  const historyPanel = doc.getElementById('panel-history');
  if (!activePanel || !historyPanel) return;
  activePanel.replaceChildren(...(activeOrders.length
    ? activeOrders.map((order) => createOrderCard(doc, order, false))
    : [createEmptyOrdersMessage(doc, 'Aún no tienes pedidos activos. Cuando hagas una compra, aparecerá aquí.')]));
  historyPanel.replaceChildren(...(historyOrders.length
    ? historyOrders.map((order) => createOrderCard(doc, order, false))
    : [createEmptyOrdersMessage(doc, 'Todavía no tienes pedidos en el historial.')]));
  const badge = doc.getElementById('active-badge');
  if (badge) {
    badge.textContent = String(activeOrders.length);
    badge.classList.toggle('hidden', activeOrders.length === 0);
  }
}

function clearUnconnectedOrderModule(doc) {
  const main = doc.querySelector('main');
  if (!main) return;
  main.replaceChildren(
    createEmptyOrdersMessage(doc, 'Aún no tienes pedidos para mostrar en esta pantalla.')
  );
}

async function hydrateSellerProfile(doc) {
  const main = doc.querySelector('main');
  if (!main) return;
  main.hidden = true;
  for (const id of ['btn-chat', 'btn-view-products']) {
    const action = doc.getElementById(id);
    if (action) action.classList.add('hidden');
  }
  const user = dashboardState.user;
  if (!user || !['seller', 'both', 'admin'].includes(user.role)) {
    main.replaceChildren();
    const message = doc.createElement('p');
    message.className = 'm-4 rounded-3xl bg-white p-5 text-sm text-slate-600';
    message.textContent = 'Esta cuenta todavía no tiene un perfil de vendedor.';
    main.append(message);
    main.hidden = false;
    return;
  }

  const [profileResult, reviewResult] = await Promise.all([
    requestJson(`/api/profile/seller/${user.id}`),
    requestJson(`/api/reviews/seller/${user.id}`)
  ]);
  const seller = profileResult.seller;
  const summary = reviewResult.summary;
  const setText = (id, value) => {
    const element = doc.getElementById(id);
    if (element) element.textContent = value;
  };
  const name = seller.fullName || user.fullName;
  const campus = seller.campusName || seller.campusCode || 'Campus no especificado';
  const reviewCount = Number(summary.reviewCount) || 0;
  const average = summary.averageRating == null ? '—' : Number(summary.averageRating).toFixed(1);

  setText('seller-profile-name', name);
  setText('seller-profile-header-campus', campus);
  setText('seller-profile-store-name', seller.storeName || 'Perfil de vendedor');
  setText('seller-profile-initials', profileInitials({ fullName: name }));
  setText('seller-profile-academic', `${campus} · ${user.career || 'Carrera no especificada'}`);
  setText('seller-profile-bio', seller.bio || 'Este vendedor aún no ha agregado una biografía.');
  setText('seller-profile-quick-rating', average);
  setText('seller-profile-quick-review-count', reviewCount);
  setText('seller-profile-average', average);
  setText('reviews-count-badge', `Total ${reviewCount} reseñas`);

  const campusStatus = doc.getElementById('seller-campus-status');
  if (campusStatus) campusStatus.classList.add('hidden');
  const pickupLocations = doc.getElementById('seller-profile-pickup-locations');
  if (pickupLocations) pickupLocations.classList.add('hidden');
  const reviewButton = doc.getElementById('btn-open-review-modal');
  if (reviewButton) reviewButton.classList.add('hidden');
  const productButton = doc.getElementById('btn-view-products');
  if (productButton) productButton.classList.add('hidden');
  const filters = doc.getElementById('review-filters');
  if (filters) filters.classList.add('hidden');

  const stars = doc.getElementById('seller-profile-stars');
  if (stars) {
    stars.replaceChildren();
    const averageValue = Number(summary.averageRating) || 0;
    for (let value = 1; value <= 5; value += 1) {
      const star = doc.createElement('i');
      star.className = averageValue >= value
        ? 'fa-solid fa-star'
        : averageValue >= value - 0.5
          ? 'fa-solid fa-star-half-stroke'
          : 'fa-regular fa-star';
      stars.append(star);
    }
  }

  const counts = [
    summary.oneStarCount,
    summary.twoStarCount,
    summary.threeStarCount,
    summary.fourStarCount,
    summary.fiveStarCount
  ].map((count) => Number(count) || 0);
  counts.forEach((count, index) => {
    const bar = doc.getElementById(`rating-bar-${index + 1}`);
    if (bar) bar.style.width = `${reviewCount ? (count / reviewCount) * 100 : 0}%`;
  });
  renderSellerReviews(doc, reviewResult.reviews);
  main.hidden = false;
}

function showSellerProfileError(doc, error) {
  const main = doc.querySelector('main');
  if (main) {
    main.replaceChildren();
    const message = doc.createElement('p');
    message.className = 'm-4 rounded-3xl bg-white p-5 text-sm text-slate-600';
    message.textContent = error.message;
    main.append(message);
    main.hidden = false;
  }
  showNotice(error.message);
  console.error(error);
}

async function saveProfileFromModule(doc) {
  const form = doc.getElementById('edit-profile-form');
  if (!form.reportValidity()) return;

  const fields = {
    fullName: doc.getElementById('input-name').value.trim(),
    campusCode: doc.getElementById('select-campus').value || null,
    career: doc.getElementById('input-career').value.trim() || null,
    studentCode: doc.getElementById('input-code').value.trim() || null
  };
  const file = doc.getElementById('avatar-file-input').files[0];
  if (file) {
    const upload = new FormData();
    upload.append('image', file);
    const result = await requestJson('/api/uploads/images', { method: 'POST', body: upload });
    fields.avatarUrl = result.image.url;
  } else {
    const preview = doc.getElementById('modal-avatar-preview');
    const previewUrl = preview && !preview.hidden ? preview.getAttribute('src') : null;
    if (previewUrl && previewUrl !== dashboardState.user.avatarUrl) {
      fields.avatarUrl = previewUrl;
    }
  }

  await requestJson('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  });
  await refreshDashboardProfile(doc);
  doc.getElementById('avatar-file-input').value = '';
  if (typeof doc.defaultView.closeEditModal === 'function') doc.defaultView.closeEditModal();
  if (typeof doc.defaultView.showToast === 'function') {
    doc.defaultView.showToast('Los cambios del perfil se guardaron.');
  }
}

async function refreshDashboardProfile(moduleDocument) {
  const body = await requestJson('/api/auth/me');
  dashboardState.user = body.user;
  $('#user-name').textContent = body.user.fullName;
  $('#campus-label').textContent = [body.user.campusName, body.user.career]
    .filter(Boolean).join(' · ');
  if (moduleDocument) hydrateProfileModule(moduleDocument);
}

async function logoutFromDashboard() {
  await requestJson('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  window.location.replace('/app/login.html');
}

function prepareModuleLinks() {
  const frame = $('#module-frame');
  try {
    const moduleDocument = frame.contentDocument;
    if (!moduleDocument || moduleDocument.location.href === 'about:blank') return;

    moduleDocument.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link || link.target === '_blank' || event.defaultPrevented) return;
      const url = new URL(link.href, moduleDocument.location.href);
      if (url.origin !== window.location.origin) return;

      const moduleName = moduleForLegacyLink(url);
      if (!moduleName) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showModule(moduleName);
    }, true);

    moduleDocument.addEventListener('submit', (event) => {
      if (event.target.id !== 'edit-profile-form') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      saveProfileFromModule(moduleDocument).catch((error) => {
        const notify = moduleDocument.defaultView.showToast;
        if (typeof notify === 'function') {
          notify(error.message, 'terracota', 'fa-triangle-exclamation');
        }
        console.error(error);
      });
    }, true);

    if (['my-profile', 'settings', 'inventory-stock'].includes(dashboardState.module)) {
      hydrateProfileModule(moduleDocument);
    } else if (dashboardState.module === 'catalog') {
      if (typeof moduleDocument.defaultView.initializeCatalog === 'function') {
        moduleDocument.defaultView.initializeCatalog();
      }
    } else if (['buyer-orders', 'seller-orders', 'delivery-pass'].includes(dashboardState.module)) {
      const orderModule = dashboardState.module === 'seller-orders' ? 'seller-orders' : 'buyer-orders';
      hydrateOrderModule(moduleDocument, orderModule).catch((error) => {
        showNotice(error.message);
        console.error(error);
      });
    } else if (['cancel-reservation', 'post-delivery-review'].includes(dashboardState.module)) {
      clearUnconnectedOrderModule(moduleDocument);
    } else if (dashboardState.module === 'seller-profile') {
      hydrateSellerProfile(moduleDocument).catch((error) =>
        showSellerProfileError(moduleDocument, error)
      );
    }
  } catch (error) {
    showNotice('No se pudo preparar la navegación de esta pantalla.');
    console.error(error);
  }
}

async function loadProfile() {
  const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (response.status === 401) {
    window.location.replace('/app/login.html');
    return;
  }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'No se pudo cargar tu perfil.');

  dashboardState.user = body.user;
  $('#user-name').textContent = body.user.fullName;
  $('#campus-label').textContent = [body.user.campusName, body.user.career]
    .filter(Boolean).join(' · ');

  const seller = sellerMode();
  document.querySelectorAll('[data-seller-only]').forEach((element) => {
    element.hidden = !seller;
  });

  const requestedModule = window.location.hash.slice(1);
  const defaultModule = seller ? 'seller-orders' : 'buyer-orders';
  showModule(modules[requestedModule] ? requestedModule : defaultModule, false);
}

window.refreshDashboardProfile = refreshDashboardProfile;
window.saveProfileFromModule = saveProfileFromModule;
window.hydrateProfileModule = hydrateProfileModule;
window.logoutFromDashboard = logoutFromDashboard;
$('#module-frame').addEventListener('load', prepareModuleLinks);
document.querySelectorAll('[data-module-nav]').forEach((button) => {
  button.addEventListener('click', () => showModule(button.dataset.moduleNav));
});
$('#module-picker').addEventListener('change', (event) => {
  if (event.target.value) showModule(event.target.value);
});
window.addEventListener('hashchange', () => {
  const moduleName = window.location.hash.slice(1);
  if (modules[moduleName] && moduleName !== dashboardState.module) {
    showModule(moduleName, false);
  }
});

$('#logout-button').addEventListener('click', () => {
  logoutFromDashboard().catch((error) => {
    showNotice(error.message);
    console.error(error);
  });
});

loadProfile().catch((error) => {
  showNotice(error.message);
  console.error(error);
});
