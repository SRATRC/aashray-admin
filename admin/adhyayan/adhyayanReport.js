let adhyayanfetch = [];

document.addEventListener('DOMContentLoaded', () => {
  const adhyayanTableBody = document.getElementById('adhyayanTable');

  const getLocationFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('location') || 'Rajnandgaon';
  };

  const fetchAdhyayanReport = async () => {
    const location = getLocationFromURL();
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/adhyayan/fetchAdhyayan?location=${encodeURIComponent(location)}`,
        options
      );
      const result = await response.json();
      adhyayanfetch = result.data || [];
      populateTable(result.data);
      setupDownloadButton();
    } catch (error) {
      console.error('Error fetching Adhyayan report:', error);
    }
  };

  // const populateTable = (data) => {
  //   adhyayanTableBody.innerHTML = '';

  //   if (!Array.isArray(data) || data.length === 0) {
  //     adhyayanTableBody.innerHTML =
  //       '<tr><td colspan="13" style="text-align:center;">No data available</td></tr>';
  //     return;
  //   }

  //   data.forEach((item, index) => {
  //     const tableRow = document.createElement('tr');

  //     tableRow.innerHTML = `
  //       <td style="text-align:center;">${index + 1}</td>
  //       <td style="text-align:center;">${item.name}</td>
  //       <td style="text-align:center;">${item.comments}</td>
  //       <td style="text-align:center;">${item.location}</td>
  //       <td style="text-align:center;">${formatDate(item.start_date)}</td>
  //       <td style="text-align:center;">${formatDate(item.end_date)}</td>
  //       <td style="text-align:center;">${item.speaker}</td>
  //       <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=confirmed">${item.confirmed_count}</a></td>
  //       <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=pending">${item.pending_count}</a></td>
  //       <td style="text-align:center;">${item.total_seats}</td>
  //       <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=waiting">${item.waitlist_count}</a></td>
  //       <td style="text-align:center;">${item.status}</td>
  //       <td style="text-align:center;">
  //         ${
  //           JSON.parse(sessionStorage.getItem('roles') || '[]').includes('adhyayanAdminReadOnly')
  //             ? '-'
  //             : `<button class="toggle-status" data-id="${item.id}" data-status="${item.status}">
  //                  ${item.status === 'open' ? 'Close' : 'Open'}
  //                </button>`
  //         }
  //       </td>
  //     `;

  //     adhyayanTableBody.appendChild(tableRow);
  //   });

  //   // Attach event listeners only for non-read-only buttons
  //   document.querySelectorAll('.toggle-status').forEach((button) => {
  //     button.addEventListener('click', toggleStatus);
  //   });

  //   enhanceTable('waitlistTable', 'tableSearch');
  // };

  const populateTable = (data) => {
  adhyayanTableBody.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    adhyayanTableBody.innerHTML =
      '<tr><td colspan="15" style="text-align:center;">No data available</td></tr>';
    return;
  }

  data.forEach((item, index) => {
    const tableRow = document.createElement('tr');

    tableRow.innerHTML = `
      <td style="text-align:center;">${index + 1}</td>
      <td style="text-align:center;">${item.name}</td>
      <td style="text-align:center;">${item.comments}</td>
      <td style="text-align:center;">${item.location}</td>
      <td style="text-align:center;">${formatDate(item.start_date)}</td>
      <td style="text-align:center;">${formatDate(item.end_date)}</td>
      <td style="text-align:center;">${item.speaker}</td>
      <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=confirmed">${item.confirmed_count}</a></td>
      <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=pending">${item.pending_count}</a></td>
      <td style="text-align:center;">${item.total_seats}</td>
      <td style="text-align:center;"><a href="adhyayanBookingslist.html?shibir_id=${item.id}&status=waiting">${item.waitlist_count}</a></td>
      <td style="text-align:center;">
        <span class="adhyayan-link" data-shibir="${item.id}" 
          style="color:blue; text-decoration:underline; cursor:pointer;">
          Click to Copy
        </span>
      </td>
      <td style="text-align:center;">
        <span class="feedback-link" data-shibir="${item.id}" 
          style="color:blue; text-decoration:underline; cursor:pointer;">
          Click to Copy
        </span>
      </td>
      <td style="text-align:center;">
      <a href="adhyayanFeedback.html?shibir_id=${item.id}" style="color:purple; text-decoration:underline; cursor:pointer;">
      Click to open
      </a>
      </td>
      <td style="text-align:center;">
        <span class="feedback-received" data-shibir="${item.id}" 
          style="color:green; text-decoration:underline; cursor:pointer;">
          Click to Open
        </span>
      </td>
      <td style="text-align:center;">${item.status}</td>
      <td style="text-align:center;">
        ${
          JSON.parse(sessionStorage.getItem('roles') || '[]').includes('adhyayanAdminReadOnly')
            ? '-'
            : `<button class="toggle-status" data-id="${item.id}" data-status="${item.status}">
                 ${item.status === 'open' ? 'Close' : 'Open'}
               </button>`
        }
      </td>
    `;

    adhyayanTableBody.appendChild(tableRow);
  });

  // Event listeners
  document.querySelectorAll('.toggle-status').forEach((button) => {
    button.addEventListener('click', toggleStatus);
  });

  document.querySelectorAll('.feedback-link').forEach((el) => {
    el.addEventListener('click', (e) => {
      const shibirId = e.target.dataset.shibir;
      const feedbackUrl = `https://aashray.vitraagvigyaan.org/adhyayan/feedback/${shibirId}`;
      navigator.clipboard.writeText(feedbackUrl)
        .then(() => alert(`Feedback link copied:\n${feedbackUrl}`))
        .catch(() => alert('Failed to copy feedback link.'));
    });
  });

  document.querySelectorAll('.adhyayan-link').forEach((el) => {
    el.addEventListener('click', (e) => {
      const shibirId = e.target.dataset.shibir;
      const adhyayanUrl = `https://aashray.vitraagvigyaan.org/adhyayan/${shibirId}`;
      navigator.clipboard.writeText(adhyayanUrl)
        .then(() => alert(`Adhyayan link copied:\n${adhyayanUrl}`))
        .catch(() => alert('Failed to copy Adhyayan link.'));
    });
  });

  // Feedback Received modal
const feedbackModal = document.getElementById('feedbackModal');
const feedbackStatsDiv = document.getElementById('feedbackStats');
const feedbackModalHeading = document.getElementById('feedbackModalHeading'); // new element
const closeModalBtn = document.querySelector('.close-modal');

document.querySelectorAll('.feedback-received').forEach((el) => {
  el.addEventListener('click', async (e) => {
    const shibirId = e.target.dataset.shibir;
    const adhyayanName = e.target.closest('tr').children[1].innerText; // 2nd cell = name
    feedbackModalHeading.innerText = `Feedback summary for '${adhyayanName}'`; // set heading

    const apiUrl = `${CONFIG.basePath}/adhyayan/feedback/${shibirId}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      console.log('Feedback API response:', result);

      const stats = result.data.stats || {};
      feedbackStatsDiv.innerHTML = `
        <p><strong>Total Responses:</strong> ${stats.total_responses || 0}</p>
        <p><strong>Avg Swadhyay Karta Rating:</strong> ${stats.avg_swadhay_karta_rating ?? 'N/A'}</p>
        <p><strong>Avg Personal Interaction Rating:</strong> ${stats.avg_personal_interaction_rating ?? 'N/A'}</p>
        <p><strong>Avg Food Rating:</strong> ${stats.avg_food_rating ?? 'N/A'}</p>
        <p><strong>Avg Stay Rating:</strong> ${stats.avg_stay_rating ?? 'N/A'}</p>
        <p><strong>Interested in Future:</strong> ${stats.interested_in_future ?? 'N/A'}</p>
      `;

      feedbackModal.style.display = 'block';
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      alert('Failed to fetch feedback.');
    }
  });
});

  closeModalBtn.addEventListener('click', () => {
    feedbackModal.style.display = 'none';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') feedbackModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === feedbackModal) feedbackModal.style.display = 'none';
  });

  enhanceTable('waitlistTable', 'tableSearch');
};

  const toggleStatus = async (event) => {
    const button = event.target;
    const adhyayanId = button.dataset.id;
    const currentStatus = button.dataset.status;
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    if (!confirm(`Are you sure you want to ${newStatus === 'open' ? 'open' : 'close'} this Adhyayan?`)) {
      return;
    }

    try {
      const response = await fetch(`${CONFIG.basePath}/adhyayan/${adhyayanId}/${newStatus}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Success: ${result.message}`);
        fetchAdhyayanReport(); // Refresh table
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error updating status:', error);
    }
  };

  const setupDownloadButton = () => {
    document.getElementById('downloadBtnContainer').innerHTML = '';
    renderDownloadButton({
      selector: '#downloadBtnContainer',
      getData: () => adhyayanfetch,
      fileName: 'all_adhyayans.xlsx',
      sheetName: 'All Adhyayans'
    });
  };

  fetchAdhyayanReport();
});
