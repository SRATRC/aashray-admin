document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('updateForm');
    const data = JSON.parse(localStorage.getItem('selectedMaintenance'));
  
    if (data) {
      document.getElementById('issuedto').value = data.issuedto || '';
      document.getElementById('department').value = data.department || '';
      document.getElementById('comments').value = data.comments || '';
      document.getElementById('status').value = data.status?.toLowerCase() || '';
    }
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const updatedStatus = document.getElementById('status').value;
      const issuedto = document.getElementById('issuedto').value;
      const department = document.getElementById('department').value;
      const comments = document.getElementById('comments').value;
  
      try {
        const res = await fetch(`https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/maintenance/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            bookingid: data.bookingid,
            issuedto,
            department,
            comments,
            status: updatedStatus
          })
        });
  
        const result = await res.json();
        if (res.ok) {
          localStorage.setItem('lastUpdated', result.data.updatedAt);
          window.location.href = 'fetchElectrical.html';
        } else {
          alert('Update failed: ' + result.message);
        }
      } catch (err) {
        console.error('Error:', err);
        alert('An error occurred while updating the request.');
      }
    });
  });
  