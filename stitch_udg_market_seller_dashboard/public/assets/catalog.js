const catalogState = {
  initialized: false,
  eventsBound: false,
  userId: null,
  campusCode: '',
  query: '',
  categoryId: '',
  requestId: 0,
  searchTimer: null
};

const catalogElement = (selector) => document.querySelector(selector);

async function catalogRequestJson(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  let body;
  try {
    body = response.status === 204 ? {} : await response.json();
  } catch (error) {
    throw new Error('El servidor devolvió una respuesta inválida.');
  }
  if (!response.ok) throw new Error(body.error || 'No se pudo cargar el catálogo.');
  return body;
}

function productPrice(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(Number(value));
}

function sellerInitials(name) {
  return (name || 'Vendedor')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
}

function setCatalogMessage(message, isError = false, retryAction = null) {
  const container = catalogElement('#catalog-message');
  container.replaceChildren();
  container.classList.toggle('is-error', isError);
  if (message) {
    const text = document.createElement('span');
    text.textContent = message;
    container.append(text);
  }
  if (retryAction) {
    const button = document.createElement('button');
    button.className = 'retry-button';
    button.type = 'button';
    button.textContent = 'Reintentar';
    button.addEventListener('click', retryAction);
    container.append(button);
  }
}

function makeSvgIcon(pathData, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  svg.append(path);
  return svg;
}

function renderEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  const icon = document.createElement('span');
  icon.className = 'empty-icon';
  icon.append(makeSvgIcon('M7 3h10l1 4h3l-1.5 14h-15L3 7h3zm1.5 2L8 7h8l-.5-2zM8 10v2a4 4 0 0 0 8 0v-2h-2v2a2 2 0 0 1-4 0v-2z'));
  const heading = document.createElement('h3');
  heading.textContent = catalogState.query || catalogState.categoryId
    ? 'No encontramos productos'
    : 'Aún no hay productos publicados';
  const description = document.createElement('p');
  description.textContent = catalogState.query || catalogState.categoryId
    ? 'Prueba con otra búsqueda o categoría.'
    : 'Los productos activos con stock y punto de entrega aparecerán aquí cuando un vendedor los publique.';
  empty.append(icon, heading, description);
  return empty;
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'product-image-wrap';
  const fallback = document.createElement('span');
  fallback.className = 'image-fallback';
  fallback.append(makeSvgIcon('M4 5h16v14H4zm2 2v10h12V7zm1 8 3-4 2 2 2-3 3 5z'));
  imageWrap.append(fallback);
  if (product.imageUrl) {
    const image = document.createElement('img');
    image.className = 'product-image';
    image.src = product.imageUrl;
    image.alt = product.name;
    image.loading = 'lazy';
    image.addEventListener('load', () => { fallback.hidden = true; }, { once: true });
    image.addEventListener('error', () => { image.remove(); }, { once: true });
    imageWrap.append(image);
  }
  const category = document.createElement('span');
  category.className = 'category-label';
  category.textContent = product.categoryName || 'Producto';
  imageWrap.append(category);

  const info = document.createElement('div');
  info.className = 'product-info';
  const titleRow = document.createElement('div');
  titleRow.className = 'product-title-row';
  const title = document.createElement('h3');
  title.className = 'product-title';
  title.textContent = product.name;
  title.title = product.name;
  const price = document.createElement('span');
  price.className = 'product-price';
  price.textContent = productPrice(product.price);
  titleRow.append(title, price);

  const description = document.createElement('p');
  description.className = 'product-description';
  description.textContent = product.description || 'Un producto de la comunidad UDG.';

  const seller = document.createElement('div');
  seller.className = 'seller-line';
  const avatar = document.createElement('span');
  avatar.className = 'seller-avatar';
  avatar.textContent = sellerInitials(product.sellerName);
  const sellerName = document.createElement('span');
  sellerName.className = 'seller-name';
  sellerName.textContent = product.sellerName || 'Vendedor UDG';
  seller.append(avatar, sellerName);

  const meta = document.createElement('div');
  meta.className = 'product-meta';
  const campus = document.createElement('span');
  campus.textContent = product.campusCode ? `Campus ${product.campusCode}` : 'Comunidad UDG';
  const stock = document.createElement('span');
  stock.textContent = `${product.stock} ${product.stock === 1 ? 'disponible' : 'disponibles'}`;
  meta.append(campus, stock);

  const button = document.createElement('button');
  button.className = 'details-button';
  button.type = 'button';
  button.textContent = 'Ver detalles';
  button.addEventListener('click', () => openProductDetails(product.id));
  info.append(titleRow, description, seller, meta, button);
  card.append(imageWrap, info);
  return card;
}

function renderProducts(products) {
  const grid = catalogElement('#product-grid');
  grid.replaceChildren();
  if (!products.length) {
    grid.append(renderEmptyState());
    return;
  }
  for (const product of products) grid.append(createProductCard(product));
}

function setResultCount(count) {
  catalogElement('#result-count').textContent =
    `${count} ${count === 1 ? 'producto' : 'productos'}`;
}

async function loadProducts() {
  const currentRequest = ++catalogState.requestId;
  setCatalogMessage('Buscando productos…');
  const query = new URLSearchParams();
  if (catalogState.query) query.set('q', catalogState.query);
  if (catalogState.categoryId) query.set('categoryId', catalogState.categoryId);
  if (catalogState.campusCode) query.set('campusCode', catalogState.campusCode);

  try {
    const { products } = await catalogRequestJson(`/api/products?${query.toString()}`);
    if (currentRequest !== catalogState.requestId) return;
    renderProducts(products);
    setResultCount(products.length);
    setCatalogMessage('');
  } catch (error) {
    if (currentRequest !== catalogState.requestId) return;
    catalogElement('#product-grid').replaceChildren();
    catalogElement('#result-count').textContent = '';
    setCatalogMessage(error.message, true, loadProducts);
    console.error(error);
  }
}

function renderCategories(categories) {
  const list = catalogElement('#category-list');
  const allButton = list.querySelector('[data-category-id=""]');
  list.replaceChildren(allButton);
  for (const category of categories) {
    const button = document.createElement('button');
    button.className = 'category-chip';
    button.type = 'button';
    button.dataset.categoryId = String(category.id);
    button.textContent = category.name;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      catalogState.categoryId = button.dataset.categoryId;
      list.querySelectorAll('.category-chip').forEach((chip) => {
        const selected = chip.dataset.categoryId === catalogState.categoryId;
        chip.classList.toggle('is-selected', selected);
        chip.setAttribute('aria-pressed', String(selected));
      });
      loadProducts();
    });
    list.append(button);
  }
  allButton.onclick = () => {
    catalogState.categoryId = '';
    list.querySelectorAll('.category-chip').forEach((chip) => {
      const selected = chip === allButton;
      chip.classList.toggle('is-selected', selected);
      chip.setAttribute('aria-pressed', String(selected));
    });
    loadProducts();
  };
}

function localDateTimeValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function createPurchaseForm(product) {
  const section = document.createElement('section');
  section.className = 'purchase-section';
  const heading = document.createElement('h3');
  heading.className = 'dialog-section-title';
  heading.textContent = 'Comprar este producto';
  section.append(heading);

  if (Number(catalogState.userId) === Number(product.sellerId)) {
    const message = document.createElement('p');
    message.className = 'purchase-note';
    message.textContent = 'No puedes comprar productos de tu propia tienda.';
    section.append(message);
    return section;
  }

  const pickupLocations = product.pickupLocations || [];
  if (!pickupLocations.length) {
    const message = document.createElement('p');
    message.className = 'purchase-note';
    message.textContent = 'Este producto no tiene puntos de entrega disponibles para hacer un pedido.';
    section.append(message);
    return section;
  }

  const form = document.createElement('form');
  form.className = 'purchase-form';
  const quantityLabel = document.createElement('label');
  quantityLabel.className = 'purchase-field';
  quantityLabel.textContent = 'Cantidad';
  const quantity = document.createElement('input');
  quantity.type = 'number';
  quantity.name = 'quantity';
  quantity.min = '1';
  quantity.max = String(product.stock);
  quantity.step = '1';
  quantity.value = '1';
  quantity.required = true;
  quantityLabel.append(quantity);

  const locationLabel = document.createElement('label');
  locationLabel.className = 'purchase-field';
  locationLabel.textContent = 'Punto de entrega';
  const locationSelect = document.createElement('select');
  locationSelect.name = 'pickupLocationId';
  locationSelect.required = true;
  locationSelect.add(new Option('Selecciona un punto', ''));
  for (const location of pickupLocations) {
    locationSelect.add(new Option(
      [location.name, location.details].filter(Boolean).join(' · '),
      String(location.id)
    ));
  }
  locationLabel.append(locationSelect);

  const pickupLabel = document.createElement('label');
  pickupLabel.className = 'purchase-field';
  pickupLabel.textContent = 'Fecha y hora para recoger';
  const pickupAt = document.createElement('input');
  pickupAt.type = 'datetime-local';
  pickupAt.name = 'pickupAt';
  pickupAt.required = true;
  const minimumPickup = new Date(Date.now() + 5 * 60 * 1000);
  minimumPickup.setSeconds(0, 0);
  minimumPickup.setMinutes(minimumPickup.getMinutes() + 1);
  const defaultPickup = new Date(Date.now() + 60 * 60 * 1000);
  defaultPickup.setSeconds(0, 0);
  pickupAt.min = localDateTimeValue(minimumPickup);
  pickupAt.value = localDateTimeValue(defaultPickup);
  pickupLabel.append(pickupAt);

  const paymentLabel = document.createElement('label');
  paymentLabel.className = 'purchase-field';
  paymentLabel.textContent = 'Método de pago';
  const paymentMethod = document.createElement('select');
  paymentMethod.name = 'paymentMethod';
  paymentMethod.required = true;
  paymentMethod.add(new Option('Efectivo al recoger', 'cash'));
  paymentMethod.add(new Option('SPEI', 'spei'));
  paymentMethod.add(new Option('Transferencia', 'transfer'));
  paymentMethod.add(new Option('Otro (acordar con vendedor)', 'other'));
  paymentLabel.append(paymentMethod);

  const note = document.createElement('p');
  note.className = 'purchase-note';
  note.textContent = 'Se enviará una solicitud al vendedor. No se realizará un cobro en línea.';
  const status = document.createElement('p');
  status.className = 'purchase-status';
  status.setAttribute('role', 'alert');
  status.hidden = true;
  const submit = document.createElement('button');
  submit.className = 'purchase-submit';
  submit.type = 'submit';
  submit.textContent = 'Comprar producto';
  form.append(quantityLabel, locationLabel, pickupLabel, paymentLabel, note, status, submit);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const pickupDate = new Date(pickupAt.value);
    if (Number.isNaN(pickupDate.getTime()) || pickupDate.getTime() <= Date.now()) {
      status.textContent = 'Elige una fecha y hora futura para recoger tu pedido.';
      status.hidden = false;
      return;
    }

    submit.disabled = true;
    status.hidden = true;
    try {
      const { order } = await catalogRequestJson('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId: product.id, quantity: Number(quantity.value) }],
          pickupLocationId: Number(locationSelect.value),
          pickupAt: pickupDate.toISOString(),
          paymentMethod: paymentMethod.value
        })
      });
      if (!order || !order.orderCode) {
        throw new Error('El servidor no confirmó el pedido. Revisa Mis pedidos antes de volver a intentarlo.');
      }

      const success = document.createElement('div');
      success.className = 'purchase-success';
      const confirmation = document.createElement('h3');
      confirmation.textContent = 'Solicitud enviada';
      const orderCode = document.createElement('p');
      orderCode.textContent = `Folio: ${order.orderCode}`;
      const pending = document.createElement('p');
      pending.textContent = 'Tu pedido está pendiente de confirmación del vendedor.';
      const ordersLink = document.createElement('a');
      ordersLink.href = '/app/dashboard.html#buyer-orders';
      ordersLink.textContent = 'Ver mis pedidos';
      success.append(confirmation, orderCode, pending, ordersLink);
      section.replaceChildren(success);
      await loadProducts();
    } catch (error) {
      status.textContent = error.message;
      status.hidden = false;
      console.error(error);
    } finally {
      submit.disabled = false;
    }
  });
  section.append(form);
  return section;
}

async function openProductDetails(productId) {
  const dialog = catalogElement('#product-dialog');
  const content = catalogElement('#dialog-product');
  content.replaceChildren();
  const title = document.createElement('h2');
  title.id = 'dialog-title';
  title.textContent = 'Detalles del producto';
  const loading = document.createElement('p');
  loading.textContent = 'Cargando detalles…';
  content.append(title, loading);
  dialog.showModal();

  try {
    const { product } = await catalogRequestJson(`/api/products/${encodeURIComponent(productId)}`);
    const image = document.createElement('img');
    image.className = 'dialog-image';
    image.alt = product.name;
    if (product.imageUrl) image.src = product.imageUrl;
    else image.hidden = true;
    image.addEventListener('error', () => { image.hidden = true; }, { once: true });

    const category = document.createElement('p');
    category.className = 'dialog-category';
    category.textContent = product.categoryName || 'Producto UDG';
    const titleRow = document.createElement('div');
    titleRow.className = 'dialog-title-row';
    const title = document.createElement('h2');
    title.id = 'dialog-title';
    title.textContent = product.name;
    const price = document.createElement('span');
    price.className = 'dialog-price';
    price.textContent = productPrice(product.price);
    titleRow.append(title, price);

    const description = document.createElement('p');
    description.className = 'dialog-description';
    description.textContent = product.description || 'El vendedor no agregó una descripción.';
    const seller = document.createElement('p');
    seller.className = 'dialog-seller';
    seller.textContent = `Vendido por ${product.sellerName || 'un estudiante UDG'} · Campus ${product.campusCode || 'UDG'}`;
    const stock = document.createElement('p');
    stock.className = 'dialog-description';
    stock.textContent = `${product.stock} ${product.stock === 1 ? 'pieza disponible' : 'piezas disponibles'}`;

    const locationTitle = document.createElement('h3');
    locationTitle.className = 'dialog-section-title';
    locationTitle.textContent = 'Puntos de entrega';
    const locations = document.createElement('ul');
    locations.className = 'pickup-list';
    for (const location of product.pickupLocations || []) {
      const item = document.createElement('li');
      item.textContent = [location.name, location.details].filter(Boolean).join(' · ');
      locations.append(item);
    }
    if (!locations.childElementCount) {
      const item = document.createElement('li');
      item.textContent = 'No hay puntos de entrega activos.';
      locations.append(item);
    }
    content.replaceChildren(
      image,
      category,
      titleRow,
      description,
      seller,
      stock,
      locationTitle,
      locations,
      createPurchaseForm(product)
    );
  } catch (error) {
    const message = document.createElement('p');
    message.className = 'dialog-error';
    message.textContent = error.message;
    title.textContent = 'No se pudieron cargar los detalles';
    content.replaceChildren(title, message);
    console.error(error);
  }
}

async function initializeCatalog() {
  if (catalogState.initialized) return;
  catalogState.initialized = true;

  if (!catalogState.eventsBound) {
    const searchInput = catalogElement('#product-search');
    const clearButton = catalogElement('#clear-search');
    catalogElement('#search-form').addEventListener('submit', (event) => {
      event.preventDefault();
      catalogState.query = searchInput.value.trim();
      loadProducts();
    });
    searchInput.addEventListener('input', () => {
      clearButton.hidden = !searchInput.value;
      window.clearTimeout(catalogState.searchTimer);
      catalogState.searchTimer = window.setTimeout(() => {
        catalogState.query = searchInput.value.trim();
        loadProducts();
      }, 250);
    });
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      clearButton.hidden = true;
      catalogState.query = '';
      searchInput.focus();
      loadProducts();
    });
    catalogElement('#close-dialog').addEventListener('click', () => {
      catalogElement('#product-dialog').close();
    });
    catalogElement('#product-dialog').addEventListener('click', (event) => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    });
    catalogState.eventsBound = true;
  }

  try {
    const [profileResult, categoryResult] = await Promise.all([
      catalogRequestJson('/api/profile'),
      catalogRequestJson('/api/products/categories')
    ]);
    const profile = profileResult.profile || {};
    catalogState.userId = profile.id || null;
    catalogState.campusCode = profile.campusCode || '';
    catalogElement('#campus-name').textContent = profile.campusName || 'Todos los campus';
    renderCategories(categoryResult.categories || []);
    await loadProducts();
  } catch (error) {
    catalogState.initialized = false;
    setCatalogMessage(error.message, true, () => initializeCatalog());
    console.error(error);
  }
}

window.initializeCatalog = initializeCatalog;
document.addEventListener('DOMContentLoaded', initializeCatalog, { once: true });
