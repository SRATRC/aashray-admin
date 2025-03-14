let currentPage = 1;
const pageSize = 10;
let totalPages = 1; // Will be updated after data fetch

async function fetchWaitlistData(page = 1) {
  try {
    const response = await fetch(
      `/api/adhyayan-waitlist?page=${page}&page_size=${pageSize}`
    );
    const data = await response.json();

    if (data && data.data) {
      totalPages = Math.ceil(data.data.length / pageSize);
      displayData(data.data);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

function displayData(data) {
  const tableBody = document
    .getElementById('waitlistTable')
    .getElementsByTagName('tbody')[0];
  tableBody.innerHTML = ''; // Clear the table before populating new data

  data.forEach((item) => {
    const row = tableBody.insertRow();
    row.insertCell(0).textContent = item.ShibirDb.name;
    row.insertCell(1).textContent = item.ShibirDb.speaker;
    row.insertCell(2).textContent = item.ShibirDb.start_date;
    row.insertCell(3).textContent = item.ShibirDb.end_date;
    row.insertCell(4).textContent = item.cardno;
    row.insertCell(5).textContent = item.CardDb.issuedto;
    row.insertCell(6).textContent = item.CardDb.mobno;
    row.insertCell(7).textContent = item.CardDb.centre;
  });

  updatePaginationButtons();
}

function updatePaginationButtons() {
  document.getElementById('prevBtn').disabled = currentPage <= 1;
  document.getElementById('nextBtn').disabled = currentPage >= totalPages;
}

function changePage(direction) {
  const newPage = currentPage + direction;
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    fetchWaitlistData(currentPage);
  }
}

// Initial data fetch
fetchWaitlistData(currentPage);
