document.addEventListener('DOMContentLoaded', function () {
  const foodCheckinForm = document.getElementById('foodCheckinForm');
  const cardnoInput = document.getElementById('cardno');

  // --- 🔒 Hands-Free Auto-Focus Lock ---
  if (cardnoInput) {
    cardnoInput.focus();
    document.addEventListener('click', function (e) {
      if (!e.target.closest('a, button, select, option')) {
        cardnoInput.focus();
      }
    });
  }

  // --- 🕒 Live Clock & Active Meal Slot Header ---
  updateMealSlotHeader();
  setInterval(updateMealSlotHeader, 1000);

  foodCheckinForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const cardno = cardnoInput.value.trim();
    if (cardno) {
      await foodCheckin(cardno);
    }
  });
});

/* ===== Active Meal Slot & Live Clock Update ===== */
function updateMealSlotHeader() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const clockEl = document.getElementById('liveClockDisplay');
  if (clockEl) clockEl.textContent = timeStr;

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMins = hours * 60 + minutes;

  const badgeEl = document.getElementById('activeMealBadge');
  if (!badgeEl) return;

  // Meal windows: Breakfast (6:00 - 10:30), Lunch (11:30 - 15:30), Dinner (18:30 - 22:30)
  if (totalMins >= 360 && totalMins <= 630) {
    badgeEl.innerHTML = '🌅 Breakfast';
    badgeEl.style.background = '#f59e0b';
  } else if (totalMins >= 690 && totalMins <= 930) {
    badgeEl.innerHTML = '☀️ Lunch';
    badgeEl.style.background = '#3b82f6';
  } else if (totalMins >= 1110 && totalMins <= 1350) {
    badgeEl.innerHTML = '🌙 Dinner';
    badgeEl.style.background = '#8b5cf6';
  } else {
    badgeEl.innerHTML = '⏸️ Off-Meal Hours';
    badgeEl.style.background = '#64748b';
  }
}

/* ===== Alert Helpers ===== */
function showAlert(element, message, type, icon = '') {
  element.className = `big-alert alert-${type}`;
  element.innerHTML = `<div style="font-size:36px; margin-bottom:8px;">${icon}</div><div>${message}</div>`;
  element.style.display = 'block';
}

function resetAlert() {
  const alertBox = document.getElementById('alert');
  const formWrapper = document.getElementById('formWrapper');

  alertBox.style.display = 'none';
  alertBox.textContent = '';
  alertBox.className = 'big-alert';
  formWrapper.style.display = 'block';
}

function playErrorSound() {
  const sound = document.getElementById('errorSound');
  if (sound) sound.play().catch(() => {});
}

/* ===== Food Check-in Request ===== */
async function foodCheckin(cardno) {
  resetAlert();

  try {
    const response = await fetch(
      `${CONFIG.basePath}/food/issue/${cardno}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({})
      }
    );

    const data = await response.json();
    const alertBox = document.getElementById('alert');
    const formWrapper = document.getElementById('formWrapper');
    const cardnoInput = document.getElementById('cardno');

    formWrapper.style.display = 'none'; // Hide form during alert

    if (response.ok) {
      const name = data.issuedto || 'Resident';
      showAlert(alertBox, `Plate issued for <strong>${name}</strong>`, 'success', '✅');
    } else {
      playErrorSound();

      let alertType = 'danger';
      let icon = '❌';

      if (data.message) {
        const msg = data.message.toLowerCase();
        if (msg.includes('already issued')) {
          alertType = 'warning';
          icon = '⚠️';
        } else if (msg.includes('invalid meal time')) {
          alertType = 'info';
          icon = 'ℹ️';
        } else if (msg.includes('booking not found')) {
          alertType = 'danger';
          icon = '❌';
        }
      }

      showAlert(alertBox, data.message || 'Error issuing plate', alertType, icon);
    }

    setTimeout(() => {
      cardnoInput.value = '';
      resetAlert();
      cardnoInput.focus();
    }, 1500);

  } catch (error) {
    const alertBox = document.getElementById('alert');
    const formWrapper = document.getElementById('formWrapper');
    const cardnoInput = document.getElementById('cardno');

    formWrapper.style.display = 'none';
    playErrorSound();
    showAlert(alertBox, 'Unexpected error occurred. Please try again.', 'danger', '❌');

    setTimeout(() => {
      cardnoInput.value = '';
      resetAlert();
      cardnoInput.focus();
    }, 1500);
  }
}
