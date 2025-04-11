document.addEventListener('DOMContentLoaded', function () {
  const foodReportsForm = document.getElementById('foodReportsForm');

  const today = formatDate(new Date());
  document.getElementById('start_date').value = today;
  document.getElementById('end_date').value = today;

  foodReportsForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const report_type = document.getElementById('report_type').value; 
    const start_date = document.getElementById('start_date').value;
    const end_date = document.getElementById('end_date').value;

    const searchParams = new URLSearchParams({
      start_date,
      end_date
    });

    window.location.pathname.replace(/\/$/, '');
    const url = `${report_type}.html?${searchParams}`;

    window.location.href = url;
  });
});