let feedbackData = [];
let currentPage = 1;
const pageSize = 20;

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('feedbackTableBody');

  const getShibirIdFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('shibir_id');
  };

  const fetchFeedback = async (page = 1) => {
    const shibir_id = getShibirIdFromURL();
    if (!shibir_id) {
      alert("Shibir ID is required in URL (e.g., ?shibir_id=123)");
      return;
    }

    try {
      const res = await fetch(
        `${CONFIG.basePath}/adhyayan/feedback/${shibir_id}?page=${page}&page_size=${pageSize}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );
      const result = await res.json();
      feedbackData = result.data.feedback || [];
      populateTable(feedbackData);
      setupDownloadButton();
    } catch (err) {
      console.error('Error fetching feedback:', err);
    }
  };

  const populateTable = (data) => {
    tableBody.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="20" style="text-align:center;">No feedback found</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="text-align:center;">${index + 1}</td>
        <td style="text-align:center;">${item.CardDb?.cardno || '-'}</td>
        <td style="text-align:center;">${item.CardDb?.issuedto || '-'}</td>
        <td style="text-align:center;">${item.CardDb?.mobno || '-'}</td>
        <td style="text-align:center;">${item.CardDb?.gender || '-'}</td>
        <td style="text-align:center;">${item.CardDb?.center || '-'}</td>
        <td style="text-align:center;">${item.CardDb?.res_status || '-'}</td>
        <td style="text-align:center;">${item.ShibirDb?.name || '-'}</td>
        <td style="text-align:center;">${item.swadhay_karta_rating ?? '-'}</td>
        <td style="text-align:center;">${item.personal_interaction_rating ?? '-'}</td>
        <td style="text-align:center;">${item.swadhay_karta_suggestions ?? '-'}</td>
        <td style="text-align:center;">${item.raj_adhyayan_interest || '-'}</td>
        <td style="text-align:center;">${item.future_topics || '-'}</td>
        <td style="text-align:left;">${item.loved_most || '-'}</td>
        <td style="text-align:left;">${item.improvement_suggestions || '-'}</td>
        <td style="text-align:center;">${item.food_rating ?? '-'}</td>
        <td style="text-align:center;">${item.stay_rating ?? '-'}</td>
        <td style="text-align:center;">${formatDateTime(item.submitted_at)}</td>
        
      `;
      tableBody.appendChild(row);
    });

    enhanceTable('feedbackTable', 'tableSearch');
  };

  const setupDownloadButton = () => {
  document.getElementById('downloadBtnContainer').innerHTML = '';

  // Flatten the feedback data for Excel
  const flattenedData = feedbackData.map(item => ({
    cardno: item.CardDb?.cardno || '-',
    issuedto: item.CardDb?.issuedto || '-',
    mobno: item.CardDb?.mobno || '-',
    gender: item.CardDb?.gender || '-',
    center: item.CardDb?.center || '-',
    res_status: item.CardDb?.res_status || '-',
    shibir_name: item.ShibirDb?.name || '-',
    swadhay_karta_rating: item.swadhay_karta_rating ?? '-',
    personal_interaction_rating: item.personal_interaction_rating ?? '-',
    swadhay_karta_suggestions: item.swadhay_karta_suggestions ?? '-',
    raj_adhyayan_interest: item.raj_adhyayan_interest || '-',
    future_topics: item.future_topics || '-',
    loved_most: item.loved_most || '-',
    improvement_suggestions: item.improvement_suggestions || '-',
    food_rating: item.food_rating ?? '-',
    stay_rating: item.stay_rating ?? '-',
    submitted_at: formatDate(item.submitted_at)
    
  }));

  renderDownloadButton({
    selector: '#downloadBtnContainer',
    getData: () => flattenedData,
    fileName: 'adhyayan_feedback.xlsx',
    sheetName: 'Feedback'
  });
};


  fetchFeedback(currentPage);
});

function formatDateTime(dateInput) {
  if (!dateInput) return '-';

  try {
    const dateObj = new Date(dateInput);

    return dateObj.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', ''); // Optional: remove comma between date & time
  } catch (err) {
    console.error('Invalid date format:', dateInput);
    return '-';
  }
}
