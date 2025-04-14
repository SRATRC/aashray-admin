function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    bookingid: params.get("bookingid"),
    department: params.get("department"),
    issuedto: params.get("issuedto"),
    comments: params.get("comments"),
    status: params.get("status"),
  };
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('updateForm');
  
    const { bookingid, department, issuedto, comments, status } = getQueryParams();

    // Prefill fields
    document.getElementById('issuedto').value = issuedto;
    document.getElementById('department').value = department;
    document.getElementById('comments').value = comments;
    document.getElementById('status').value = status;
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const status = document.getElementById('status').value;
      const comments = document.getElementById('comments').value;
  
      try {
        const res = await fetch(`${CONFIG.basePath}/maintenance/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          },
          body: JSON.stringify({
            bookingid: bookingid,
            comments,
            status: status
          })
        });
  
        const result = await res.json();
        if (res.ok) {
          window.location.href = `maintenance.html?department=${department}`;
        } else {
          alert('Update failed: ' + result.message);
        }
      } catch (err) {
        console.error('Error:', err);
        alert('An error occurred while updating the request.');
      }
    });
  });
  