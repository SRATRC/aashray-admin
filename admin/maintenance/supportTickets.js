let supportTickets = [];
let filteredTickets = [];

document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document
    .getElementById('supportTicketsTable')
    .querySelector('tbody');

  const searchInputId = 'supportTicketsSearch';
  const downloadBtnContainerId = 'downloadBtnContainer';
  const serviceFilterContainerId = 'serviceFilter';

  // Inject search input & download container if not already present
  const tableContainer = document.querySelector('#supportTicketsTable').parentElement;
  if (!document.getElementById(searchInputId)) {
    const searchInput = document.createElement('input');
    searchInput.id = searchInputId;
    searchInput.className = 'form-control search-box';
    searchInput.placeholder = 'Search...';
    tableContainer.insertBefore(searchInput, tableContainer.firstChild);
  }

  if (!document.getElementById(downloadBtnContainerId)) {
    const downloadDiv = document.createElement('div');
    downloadDiv.id = downloadBtnContainerId;
    downloadDiv.style.margin = '10px 0';
    tableContainer.insertBefore(downloadDiv, tableContainer.firstChild.nextSibling);
  }

  const fetchTickets = async () => {
    console.log('Fetching support tickets...');
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(`${CONFIG.basePath}/maintenance/fetchSupport`, options);
      const result = await response.json();
      supportTickets = result.data || [];
      filteredTickets = [...supportTickets];

      populateServiceFilter();
      populateTable(filteredTickets);
      setupEnhanceTable();
      setupDownloadButton();
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">Failed to load data</td></tr>`;
    }
  };

  const populateTable = (data) => {
    tableBody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;">No tickets available</td></tr>`;
      return;
    }

    data.forEach((ticket, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="text-align:center;">${index + 1}</td>
        <td style="text-align:center;">${ticket.issued_by || ''}</td>
        <td style="text-align:center;">${ticket.issuedto || ''}</td>
        <td style="text-align:center;">${ticket.mobno || ''}</td>
        <td style="text-align:center;">${ticket.gender || ''}</td>
        <td style="text-align:center;">${
          ticket.dob ? new Date(ticket.dob).toLocaleDateString() : ''
        }</td>
        <td style="text-align:center;">${ticket.center || ''}</td>
        <td style="text-align:center;">${ticket.res_status || ''}</td>
        <td style="text-align:center;">${ticket.service || ''}</td>
        <td style="text-align:center;">${ticket.issue || ''}</td>
        <td style="text-align:center;">${
          ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ''
        }</td>
      `;
      tableBody.appendChild(row);
    });
  };

  const populateServiceFilter = () => {
    const container = document.getElementById(serviceFilterContainerId);
    container.innerHTML = '<strong>Filter by Service:</strong> ';

    // Get unique service types
    const services = [...new Set(supportTickets.map(t => t.service).filter(Boolean))];
services.forEach(service => {
  const label = document.createElement('label');
  label.style.display = 'inline-block';  // keep in line
  label.style.marginRight = '15px';       // spacing between checkboxes

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = service;
  checkbox.checked = true;
  checkbox.addEventListener('change', applyFilters);

  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(' ' + service));
  container.appendChild(label);
});

  };

  const applyFilters = () => {
    // Get checked services
    const checkedServices = Array.from(
      document.querySelectorAll(`#${serviceFilterContainerId} input[type="checkbox"]:checked`)
    ).map(cb => cb.value);

    filteredTickets = supportTickets.filter(ticket => checkedServices.includes(ticket.service));
    populateTable(filteredTickets);
    enhanceTable('supportTicketsTable', searchInputId); // reapply search & sort
    setupDownloadButton();
  };

  const setupEnhanceTable = () => {
    injectDataKeysToHeaders('#supportTicketsTable', {
      sr: 'sr',
      issued_by: 'issued_by',
      issuedto: 'issuedto',
      mobno: 'mobno',
      gender: 'gender',
      center: 'center',
      res_status: 'res_status',
      service: 'service',
      issue: 'issue',
      createdAt: 'createdAt'
    });
    enhanceTable('supportTicketsTable', searchInputId);
  };

  const injectDataKeysToHeaders = (tableSelector, keyMap) => {
    const headerCells = document.querySelectorAll(`${tableSelector} thead th`);
    const keys = Object.keys(keyMap);

    headerCells.forEach((th, index) => {
      if (!th.hasAttribute('data-key') && keys[index]) {
        th.setAttribute('data-key', keyMap[keys[index]]);
      }
    });
  };

  const setupDownloadButton = () => {
    document.getElementById(downloadBtnContainerId).innerHTML = '';
    renderDownloadButton({
      selector: `#${downloadBtnContainerId}`,
      getData: () => filteredTickets,
      fileName: 'supportTickets.xlsx',
      sheetName: 'Support Tickets',
      tableSelector: '#supportTicketsTable'
    });
  };

  fetchTickets();
});
