document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  const dataList = document
    .getElementById('data-list')
    .getElementsByTagName('tbody')[0];

  let debounceTimer;

  // Initially hide the table
  document.getElementById('data-list').style.display = 'none';

  const fetchData = async (query) => {
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const url = query
        ? `${CONFIG.basePath}/avt/search/${encodeURIComponent(
            query
          )}`
        : `${CONFIG.basePath}/avt/getAll`;

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      displayData(data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      dataList.innerHTML = '<tr><td colspan="3">No results found</td></tr>';
    }
  };

  const displayData = (data) => {
    console.log(`Displaying ${data.length} records`);
    dataList.innerHTML = '';

    if (Array.isArray(data) && data.length > 0) {
      document.getElementById('data-list').style.display = 'table'; // Show the table
      data.forEach((item) => {
        const row = document.createElement('tr');

        // Name and Card Number
        const nameCell = document.createElement('td');
        nameCell.textContent = item.issuedto;
        row.appendChild(nameCell);

        const cardCell = document.createElement('td');
        cardCell.textContent = item.cardno;
        row.appendChild(cardCell);

        const mobCell = document.createElement('td');
        mobCell.textContent = item.mobno;
        row.appendChild(mobCell);

        const emailCell = document.createElement('td');
        emailCell.textContent = item.email;
        row.appendChild(emailCell);

        const photoCell = document.createElement('td');

// Create uncopyable link text
const photoLink = document.createElement('span');
photoLink.textContent = 'View Photo';
photoLink.style.color = 'blue';
photoLink.style.textDecoration = 'underline';
photoLink.style.cursor = 'pointer';
photoLink.style.userSelect = 'none';
photoLink.oncopy = e => e.preventDefault();

// Click event to open preview
photoLink.addEventListener('click', () => {
  // Avoid duplicate overlays
  if (document.getElementById('photoOverlay')) return;

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'photoOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';

  // Create image
  const img = document.createElement('img');
  img.src = item.pfp;
  img.style.maxWidth = '80vw';
  img.style.maxHeight = '80vh';
  img.style.border = '4px solid white';
  img.style.boxShadow = '0 0 20px black';
  img.oncontextmenu = e => e.preventDefault();
  img.ondragstart = e => e.preventDefault();
  img.style.pointerEvents = 'none';

  // Create close button
  const closeBtn = document.createElement('span');
  closeBtn.textContent = '❌';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '20px';
  closeBtn.style.right = '30px';
  closeBtn.style.fontSize = '30px';
  closeBtn.style.color = 'white';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.userSelect = 'none';

  // Close logic
  function closeOverlay() {
    if (overlay) overlay.remove();
    document.removeEventListener('keydown', escHandler);
  }

  const escHandler = e => {
    if (e.key === 'Escape') closeOverlay();
  };

  closeBtn.addEventListener('click', closeOverlay);
  document.addEventListener('keydown', escHandler);

  overlay.appendChild(img);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
});

photoCell.appendChild(photoLink);
row.appendChild(photoCell);

        

        dataList.appendChild(row);
      });
    } else {
      document.getElementById('data-list').style.display = 'none'; // Hide if no results
    }
  };

  // Debounce function: waits for user to stop typing before triggering search
  const debounce = (callback, delay) => {
    return (...args) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => callback(...args), delay);
    };
  };

  // Search functionality with debounce (500ms delay)
  searchInput.addEventListener(
    'input',
    debounce(async () => {
      const query = searchInput.value.trim().toLowerCase();

      if (query.length === 0) {
        document.getElementById('data-list').style.display = 'none'; // Hide the table
        return;
      }

      await fetchData(query);
    }, 500) // 500ms delay before search starts
  );
});

function showSuccessMessage(message) {
  alert(message);
}

function showErrorMessage(message) {
  alert("Error: " + message);
}

function resetAlert() {
  // This could clear UI banners if used in future (currently placeholder)
}