document.addEventListener('DOMContentLoaded', function () {
  const foodCheckinForm = document.getElementById('foodCheckinForm');

  foodCheckinForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const cardno = document.getElementById('cardno').value.trim();
    await foodCheckin(cardno);
  });
});

function showAlert(element, message, type) {
  element.className = `big-alert alert-${type}`;
  element.textContent = message;
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
  sound.play();
}

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

    formWrapper.style.display = 'none'; // Hide form

    if (response.ok) {
      const name = data.issuedto || 'Unknown';
      showAlert(alertBox, `Plate issued for ${name}`, 'success');
    } else {
      playErrorSound();

      // 🔥 DIFFERENTIATE ERROR TYPE
      let alertType = 'danger'; // default = red

if (data.message) {
  const msg = data.message.toLowerCase();

  if (msg.includes('already issued')) {
    alertType = 'warning'; // 🟤 brown
  } else if (msg.includes('invalid meal time')) {
    alertType = 'info'; // 🔵 blue
  } else if (msg.includes('booking not found')) {
    alertType = 'danger'; // 🔴 red
  }
}

      showAlert(alertBox, data.message || 'Error issuing plate', alertType);
    }

    setTimeout(() => {
      cardnoInput.value = '';
      resetAlert();
      cardnoInput.focus();
    }, 400);

  } catch (error) {
    const alertBox = document.getElementById('alert');
    const formWrapper = document.getElementById('formWrapper');
    const cardnoInput = document.getElementById('cardno');

    formWrapper.style.display = 'none';
    playErrorSound();
    showAlert(alertBox, 'Unexpected error occurred. Please try again.', 'danger');

    setTimeout(() => {
      resetAlert();
      cardnoInput.focus();
    }, 400);
  }
}
