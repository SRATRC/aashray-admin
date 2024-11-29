document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/physicalPlates',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );

    const data = await response.json();
    console.log(data);

    if (response.ok) {
      const plates = data.data;
      const platesTableBody = document
        .getElementById('physicalPlatesContainer')
        .querySelector('tbody');

      plates.forEach((plate) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${plate.date}</td>
          <td>${plate.type}</td>
          <td>${plate.count}</td>
        `;
        platesTableBody.appendChild(row);
      });
    } else {
      console.error('Failed to fetch physical plates:', data.message);
      alert('Failed to fetch physical plates.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error fetching physical plates.');
  }
});
