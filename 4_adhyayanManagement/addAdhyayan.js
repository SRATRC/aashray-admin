document
  .getElementById('adhyayanForm')
  .addEventListener('submit', async function (event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => (data[key] = value));

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/create',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify(data)
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        form.reset();
      } else {
        const error = await response.json();
        alert('Error: ' + error.message);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
