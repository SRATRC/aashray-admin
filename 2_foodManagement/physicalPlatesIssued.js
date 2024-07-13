document.addEventListener('DOMContentLoaded', function () {
  document
    .getElementById('physicalPlatesForm')
    .addEventListener('submit', async function (event) {
      event.preventDefault();

      const date = document.getElementById('plateDate').value;
      const type = document.getElementById('plateType').value;
      const count = document.getElementById('plateCount').value;

      try {
        const response = await fetch(
          'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/physicalPlates',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify({ date, type, count })
          }
        );

        const data = await response.json();

        if (response.ok) {
          document.getElementById('responseMessage').textContent = data.message;
          clearForm();
        } else {
          console.error('Failed to add physical plates:', data.message);
          alert('Failed to add physical plates.');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error adding physical plates.');
      }
    });
});

function clearForm() {
  document.getElementById('plateDate').value = '';
  document.getElementById('plateType').selectedIndex = 0;
  document.getElementById('plateCount').value = '';
}
