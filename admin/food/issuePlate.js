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
    if (response.ok) {
      alert(data.message); // success popup
      window.location.href = '/admin/food/issuePlate.html'; // redirect on OK
    } else {
      alert(`Error: ${data.message}`); // error popup
      window.location.href = '/admin/food/issuePlate.html'; // redirect on OK
    }
  } catch (error) {
    alert(`Unexpected Error: ${error.message}`);
    window.location.href = '/admin/food/issuePlate.html';
  }
}
