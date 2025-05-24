document.addEventListener('DOMContentLoaded', function () {
  const urlParams = new URLSearchParams(window.location.search);
  const utsavid = urlParams.get('utsavId');
  const utsavName = urlParams.get('utsavName');

  // Fill Utsav Name (read-only)
  if (utsavName) {
    const utsavNameInput = document.getElementById('utsav_name');
    utsavNameInput.value = utsavName;
  }

  const utsavPackageForm = document.getElementById('utsavPackageForm');

  utsavPackageForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const formData = new FormData(utsavPackageForm);
    const requestData = {
      utsavid: utsavid,
      utsavName: formData.get('utsav_name'), // Optional: include for backend logging or validation
      name: formData.get('packageName'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      amount: formData.get('amount')
    };

    try {
      const response = await fetch(`${CONFIG.basePath}/utsav/package`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Success: ${data.message}`);
        utsavPackageForm.reset();
        document.getElementById('utsav_name').value = utsavName; // Refill utsav name
        window.location.href = '../utsav/fetchAllUtsav.html';
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create Utsav Package. Please try again.');
    }
  });
});
