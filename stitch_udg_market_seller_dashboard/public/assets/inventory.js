const inventoryState = {
  products: [],
  categories: [],
  locations: [],
  toastTimer: null
};

async function inventoryRequest(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers
  });
  let body;
  try {
    body = response.status === 204 ? {} : await response.json();
  } catch (error) {
    throw new Error('El servidor devolvió una respuesta inválida.');
  }
  if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación.');
  return body;
}

async function uploadInventoryImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const result = await inventoryRequest('/api/uploads/images', {
    method: 'POST',
    body: formData
  });
  if (!result.image || !result.image.url) {
    throw new Error('El servidor no confirmó la carga de la imagen.');
  }
  return result.image.url;
}

function inventoryPrice(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2
  }).format(Number(value));
}

function inventoryToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('flex');
  window.clearTimeout(inventoryState.toastTimer);
  inventoryState.toastTimer = window.setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('flex');
  }, 3000);
}

function inventoryElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function updateImagePreview(input, preview, fallbackUrl = '') {
  if (preview.dataset.objectUrl) {
    URL.revokeObjectURL(preview.dataset.objectUrl);
    delete preview.dataset.objectUrl;
  }
  const file = input.files[0];
  if (file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      input.value = '';
      preview.removeAttribute('src');
      preview.hidden = true;
      inventoryToast('Elige una imagen JPG, PNG o WebP.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    preview.dataset.objectUrl = objectUrl;
    preview.src = objectUrl;
    preview.hidden = false;
    return;
  }
  if (fallbackUrl) {
    preview.src = fallbackUrl;
    preview.hidden = false;
    return;
  }
  preview.removeAttribute('src');
  preview.hidden = true;
}

function inventoryEmptyState(message, retry = false) {
  const item = inventoryElement('li', 'rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm');
  item.append(inventoryElement('p', 'text-sm font-semibold text-slate-500', message));
  if (retry) {
    const button = inventoryElement('button', 'mt-3 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-[#1E293B] hover:bg-slate-200', 'Reintentar');
    button.type = 'button';
    button.addEventListener('click', loadInventory);
    item.append(button);
  }
  return item;
}

function inventoryCard(product) {
  const soldOut = product.stock === 0;
  const active = product.isActive && !soldOut;
  const item = inventoryElement('li', `rounded-2xl border ${soldOut ? 'border-red-100' : 'border-slate-100'} bg-white p-3 shadow-sm`);
  item.dataset.id = String(product.id);

  const row = inventoryElement('div', 'flex items-start gap-3');
  const imageWrap = inventoryElement('div', 'h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-slate-100');
  if (product.imageUrl) {
    const image = inventoryElement('img', `h-full w-full object-cover ${product.isActive ? '' : 'grayscale opacity-60'}`);
    image.src = product.imageUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => image.remove(), { once: true });
    imageWrap.append(image);
  } else {
    imageWrap.append(inventoryElement('span', 'flex h-full w-full items-center justify-center text-slate-300'));
    imageWrap.firstElementChild.innerHTML = '<i class="fa-solid fa-image" aria-hidden="true"></i>';
  }

  const content = inventoryElement('div', 'min-w-0 flex-1');
  const heading = inventoryElement('div', 'flex items-start justify-between gap-2');
  const identity = inventoryElement('div', 'min-w-0');
  identity.append(
    inventoryElement('h2', `font-bold leading-snug ${product.isActive ? '' : 'text-slate-500'}`, product.name),
    inventoryElement('p', 'text-sm text-slate-500', inventoryPrice(product.price))
  );
  const switchWrap = inventoryElement('div', 'flex shrink-0 flex-col items-center gap-1');
  const toggle = inventoryElement('button', `relative h-9 w-16 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34D399] focus-visible:ring-offset-2 ${active ? 'bg-[#34D399]' : 'bg-slate-300'} ${soldOut ? 'cursor-not-allowed opacity-70' : ''}`);
  toggle.type = 'button';
  toggle.dataset.action = 'toggle';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', String(active));
  toggle.setAttribute('aria-label', `${product.name}: ${active ? 'Activo' : 'Pausado'}`);
  toggle.disabled = soldOut;
  if (soldOut) toggle.title = 'Aumenta el stock para activarlo';
  toggle.append(inventoryElement('span', `absolute left-1 top-1 h-7 w-7 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-7' : ''}`));
  switchWrap.append(toggle, inventoryElement('span', `text-[11px] font-bold ${active ? 'text-emerald-600' : 'text-slate-500'}`, active ? 'Activo' : 'Pausado'));
  heading.append(identity, switchWrap);

  const controls = inventoryElement('div', 'mt-2 flex flex-wrap items-center justify-between gap-2');
  const stockControls = inventoryElement('div', 'flex flex-wrap items-center gap-2');
  const stepper = inventoryElement('div', 'inline-flex items-center overflow-hidden rounded-xl bg-slate-100');
  stepper.setAttribute('role', 'group');
  stepper.setAttribute('aria-label', `Stock de ${product.name}`);
  const decrease = inventoryElement('button', 'h-12 w-12 text-lg text-[#1E293B] transition hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30');
  decrease.type = 'button';
  decrease.dataset.action = 'dec';
  decrease.setAttribute('aria-label', 'Quitar uno');
  decrease.disabled = soldOut;
  decrease.innerHTML = '<i class="fa-solid fa-minus" aria-hidden="true"></i>';
  const stock = inventoryElement('span', `w-12 text-center text-xl font-extrabold tabular-nums ${soldOut ? 'text-red-500' : ''}`, String(product.stock));
  stock.setAttribute('aria-live', 'polite');
  const increase = inventoryElement('button', 'h-12 w-12 text-lg text-[#1E293B] transition hover:bg-slate-200 active:bg-slate-300 disabled:opacity-30');
  increase.type = 'button';
  increase.dataset.action = 'inc';
  increase.setAttribute('aria-label', 'Agregar uno');
  increase.disabled = product.stock >= 100000;
  increase.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
  stepper.append(decrease, stock, increase);
  stockControls.append(stepper);
  stockControls.append(soldOut
    ? inventoryElement('span', 'inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-600', 'Agotado')
    : inventoryElement('span', 'text-xs text-slate-400', 'disponibles'));

  const edit = inventoryElement('button', 'inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-[#1E293B] transition hover:bg-slate-200 active:scale-95');
  edit.type = 'button';
  edit.dataset.action = 'edit';
  edit.setAttribute('aria-label', `Editar ${product.name}`);
  edit.innerHTML = '<i class="fa-solid fa-pen-to-square text-[#FF7A59]" aria-hidden="true"></i> Editar';
  controls.append(stockControls, edit);
  content.append(heading, controls);
  row.append(imageWrap, content);
  item.append(row);
  return item;
}

function renderInventory() {
  const list = document.getElementById('list');
  list.replaceChildren();
  if (!inventoryState.products.length) {
    list.append(inventoryEmptyState('Aún no has publicado productos. Publica uno para que aparezca en Explorar.'));
  } else {
    for (const product of inventoryState.products) list.append(inventoryCard(product));
  }

  const activeCount = inventoryState.products.filter((product) => product.isActive && product.stock > 0).length;
  const soldOutCount = inventoryState.products.filter((product) => product.stock === 0).length;
  const pausedCount = inventoryState.products.length - activeCount - soldOutCount;
  const summary = document.getElementById('summary');
  summary.replaceChildren();
  const active = inventoryElement('strong', 'text-emerald-600', `${activeCount} activo${activeCount === 1 ? '' : 's'}`);
  summary.append(active, document.createTextNode(` · ${pausedCount} pausado${pausedCount === 1 ? '' : 's'}`));
  if (soldOutCount) {
    const soldOut = inventoryElement('strong', 'text-red-500', ` · ${soldOutCount} agotado${soldOutCount === 1 ? '' : 's'}`);
    summary.append(soldOut);
  }
}

async function loadInventory() {
  const list = document.getElementById('list');
  list.replaceChildren(inventoryEmptyState('Cargando tu inventario…'));
  try {
    const [productResult, categoryResult, locationResult] = await Promise.all([
      inventoryRequest('/api/products/mine'),
      inventoryRequest('/api/products/categories'),
      inventoryRequest('/api/products/pickup-locations/mine')
    ]);
    if (!Array.isArray(productResult.products) ||
        !Array.isArray(categoryResult.categories) ||
        !Array.isArray(locationResult.locations)) {
      throw new Error('El servidor devolvió datos de inventario inválidos.');
    }
    inventoryState.products = productResult.products;
    inventoryState.categories = categoryResult.categories;
    inventoryState.locations = locationResult.locations.filter((location) => location.isActive);
    renderInventory();
    renderCreateOptions();
  } catch (error) {
    console.error(error);
    document.getElementById('summary').textContent = 'No se pudo cargar el inventario.';
    list.replaceChildren(inventoryEmptyState(error.message, true));
  }
}

function renderCreateOptions() {
  const categorySelect = document.getElementById('create-category');
  categorySelect.replaceChildren(new Option('Sin categoría', ''));
  for (const category of inventoryState.categories) {
    categorySelect.add(new Option(category.name, String(category.id)));
  }

  const locationSelect = document.getElementById('create-location');
  locationSelect.replaceChildren(new Option('Selecciona un punto', ''));
  for (const location of inventoryState.locations) {
    locationSelect.add(new Option(
      [location.name, location.details].filter(Boolean).join(' · '),
      String(location.id)
    ));
  }

  const needsLocation = inventoryState.locations.length === 0;
  document.getElementById('existing-location-group').classList.toggle('hidden', needsLocation);
  document.getElementById('new-location-group').classList.toggle('hidden', !needsLocation);
  locationSelect.required = !needsLocation;
  document.getElementById('create-location-name').required = needsLocation;
}

const editModal = document.getElementById('edit-modal');
const createModal = document.getElementById('create-modal');

function showModal(modal) {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function hideModal(modal) {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function openEditModal(product) {
  document.getElementById('edit-id').value = String(product.id);
  document.getElementById('edit-title').value = product.name;
  document.getElementById('edit-price').value = String(product.price);
  document.getElementById('edit-stock').value = String(product.stock);
  document.getElementById('edit-image').value = '';
  updateImagePreview(
    document.getElementById('edit-image'),
    document.getElementById('edit-image-preview'),
    product.imageUrl || ''
  );
  showModal(editModal);
  document.getElementById('edit-title').focus();
}

function openCreateModal() {
  document.getElementById('create-form').reset();
  document.getElementById('create-error').classList.add('hidden');
  updateImagePreview(document.getElementById('create-image'), document.getElementById('create-image-preview'));
  renderCreateOptions();
  showModal(createModal);
  document.getElementById('create-name').focus();
}

document.getElementById('edit-close').addEventListener('click', () => hideModal(editModal));
document.getElementById('edit-cancel').addEventListener('click', () => hideModal(editModal));
document.getElementById('create-close').addEventListener('click', () => hideModal(createModal));
document.getElementById('create-cancel').addEventListener('click', () => hideModal(createModal));
for (const modal of [editModal, createModal]) {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) hideModal(modal);
  });
}
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  for (const modal of [editModal, createModal]) {
    if (!modal.classList.contains('hidden')) hideModal(modal);
  }
});

document.getElementById('open-create').addEventListener('click', openCreateModal);
document.getElementById('create-image').addEventListener('change', (event) => {
  updateImagePreview(event.currentTarget, document.getElementById('create-image-preview'));
});
document.getElementById('edit-image').addEventListener('change', (event) => {
  updateImagePreview(event.currentTarget, document.getElementById('edit-image-preview'));
});

document.getElementById('edit-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.getElementById('edit-id').value;
  const submit = event.currentTarget.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const imageFile = document.getElementById('edit-image').files[0];
    const fields = {
      name: document.getElementById('edit-title').value.trim(),
      price: Number(document.getElementById('edit-price').value),
      stock: Number(document.getElementById('edit-stock').value)
    };
    if (imageFile) fields.imageUrl = await uploadInventoryImage(imageFile);
    await inventoryRequest(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(fields)
    });
    hideModal(editModal);
    await loadInventory();
    inventoryToast('Producto actualizado correctamente.');
  } catch (error) {
    console.error(error);
    inventoryToast(error.message);
    await loadInventory();
  } finally {
    submit.disabled = false;
  }
});

document.getElementById('create-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = document.getElementById('create-submit');
  const errorText = document.getElementById('create-error');
  submit.disabled = true;
  errorText.classList.add('hidden');
  let createdLocation = false;

  try {
    const imageFile = document.getElementById('create-image').files[0];
    const imageUrl = imageFile ? await uploadInventoryImage(imageFile) : null;
    let locationId = Number(document.getElementById('create-location').value);
    if (!inventoryState.locations.length) {
      const { location } = await inventoryRequest('/api/products/pickup-locations', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('create-location-name').value.trim(),
          details: document.getElementById('create-location-details').value.trim() || null
        })
      });
      if (!location || !location.id) throw new Error('El servidor no confirmó el punto de entrega.');
      locationId = location.id;
      createdLocation = true;
    }

    await inventoryRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('create-name').value.trim(),
        description: document.getElementById('create-description').value.trim() || null,
        categoryId: document.getElementById('create-category').value
          ? Number(document.getElementById('create-category').value)
          : null,
        price: Number(document.getElementById('create-price').value),
        stock: Number(document.getElementById('create-stock').value),
        pickupLocationIds: [locationId],
        imageUrl
      })
    });
    hideModal(createModal);
    form.reset();
    await loadInventory();
    inventoryToast('Producto publicado. Ya puede aparecer en Explorar.');
  } catch (error) {
    console.error(error);
    if (createdLocation) {
      await loadInventory();
      errorText.textContent = `El punto de entrega se guardó, pero el producto no se publicó: ${error.message}`;
    } else {
      errorText.textContent = error.message;
    }
    errorText.classList.remove('hidden');
  } finally {
    submit.disabled = false;
  }
});

document.getElementById('list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const item = button.closest('[data-id]');
  const product = inventoryState.products.find((entry) => String(entry.id) === item.dataset.id);
  if (!product) return;
  if (button.dataset.action === 'edit') {
    openEditModal(product);
    return;
  }

  button.disabled = true;
  try {
    if (button.dataset.action === 'toggle') {
      await inventoryRequest(`/api/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !product.isActive })
      });
    } else {
      const stock = product.stock + (button.dataset.action === 'inc' ? 1 : -1);
      await inventoryRequest(`/api/products/${encodeURIComponent(product.id)}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ stock })
      });
    }
    await loadInventory();
    inventoryToast(button.dataset.action === 'toggle'
      ? `“${product.name}” ${product.isActive ? 'pausado' : 'activado'}.`
      : 'Existencias actualizadas.');
  } catch (error) {
    console.error(error);
    inventoryToast(error.message);
    await loadInventory();
  } finally {
    button.disabled = false;
  }
});

loadInventory();
