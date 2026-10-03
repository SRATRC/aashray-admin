// Reference phone check for the card screens. Staff type the host's phone number
// and see the host's name and member type (staff-only lookup). A host who is not a
// Mumukshu gets a warning. Waits for a pause in typing, sends the staff token, and
// ignores a slow answer that arrives after the number has changed.
function attachRefPhoneCheck(inputEl, messageEl) {
  let timer = null;
  let latest = '';

  function show(text, ok) {
    messageEl.textContent = text;
    messageEl.style.color = ok === null ? '#777' : ok === 'warn' ? '#e65100' : ok ? '#2e7d32' : '#c62828';
  }

  async function check(phone) {
    latest = phone;
    show('Checking...', null);
    try {
      const res = await fetch(
        `${CONFIG.basePath}/card/by-mobile/${encodeURIComponent(phone)}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const body = await res.json().catch(() => ({}));
      if (latest !== phone) return;
      if (res.status === 404) {
        show('Phone number is not registered!', false);
        return;
      }
      if (!res.ok) {
        show(body.message || 'Could not check this phone number', false);
        return;
      }
      const card = body.data || {};
      const type = String(card.res_status || '').toUpperCase();
      const label = `${card.issuedto || 'Member'} (${card.res_status || 'unknown type'})`;
      if (type === 'MUMUKSHU') show(label, true);
      else show(`${label} - this host is not a Mumukshu`, 'warn');
    } catch (err) {
      if (latest === phone) show('Error checking phone number', false);
    }
  }

  inputEl.addEventListener('input', () => {
    clearTimeout(timer);
    const phone = inputEl.value.trim();
    latest = phone;
    if (phone.length !== 10) {
      show('', true);
      return;
    }
    timer = setTimeout(() => check(phone), 400);
  });
}

// Escape a value before it goes into innerHTML
function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
  );
}
