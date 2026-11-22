const authForm = document.querySelector('[data-auth-form]');

function showAuthMessage(message, isSuccess) {
  const notice = authForm.querySelector('.notice');
  notice.textContent = message;
  notice.classList.toggle('success', Boolean(isSuccess));
}

if (authForm && authForm.dataset.authForm === 'register') {
  const campusSelect = authForm.elements.campusCode;
  const accountType = authForm.elements.accountType;
  const storeField = authForm.querySelector('[data-store-field]');

  fetch('/api/auth/campuses')
    .then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudieron cargar los campus.');
      campusSelect.innerHTML = '<option value="">Selecciona tu campus</option>';
      for (const campus of body.campuses) {
        const option = document.createElement('option');
        option.value = campus.code;
        option.textContent = campus.name;
        campusSelect.append(option);
      }
    })
    .catch((error) => showAuthMessage(error.message, false));

  const updateStoreField = () => {
    const isSeller = accountType.value === 'seller';
    storeField.hidden = !isSeller;
    authForm.elements.storeName.required = isSeller;
  };
  accountType.addEventListener('change', updateStoreField);
  updateStoreField();
}

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = authForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showAuthMessage('', false);

  try {
    const formData = new FormData(authForm);
    const payload = Object.fromEntries(formData.entries());
    const endpoint = authForm.dataset.authForm === 'login' ? '/api/auth/login' : '/api/auth/register';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const body = response.status === 204 ? {} : await response.json();
    if (!response.ok) throw new Error(body.error || 'No se pudo completar la solicitud.');
    window.location.assign('/app/dashboard.html');
  } catch (error) {
    showAuthMessage(error.message, false);
  } finally {
    submitButton.disabled = false;
  }
});
