document.addEventListener('DOMContentLoaded', function () {
  const foodCheckinForm = document.getElementById('foodCheckinForm');

  foodCheckinForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const cardno = document.getElementById('cardno').value.trim();
    await foodCheckin(cardno);
  });
});

async function foodCheckin(cardno) {
  resetAlert();

  try {
    const response = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/issue/${cardno}`,
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

    formWrapper.style.display = 'none'; // Hide form

    if (response.ok) {
      showAlert(alertBox, data.message, 'success');
    } else {
      playErrorSound();
      showAlert(alertBox, data.message || 'Error issuing plate', 'danger');
    }

    setTimeout(() => {
      window.location.reload();
    }, 2000);

  } catch (error) {
    const alertBox = document.getElementById('alert');
    const formWrapper = document.getElementById('formWrapper');

    formWrapper.style.display = 'none'; // Hide form
    playErrorSound();
    showAlert(alertBox, 'Unexpected error occurred. Please try again.', 'danger');

    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
}

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
