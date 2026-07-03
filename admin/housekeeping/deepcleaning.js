document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.querySelector('#housekeepingTable tbody');
  const searchInput = document.getElementById('tableSearch');
  const filterTabs = document.querySelectorAll('#statusFilters .filter-tab');

  let allData = [];
  let currentFilter = 'all';

  const fetchHousekeeping = async () => {
    console.log('Fetching Housekeeping status...');
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/maintenance/housekeeping/deep-cleaning/status`,
        options
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Housekeeping status received:', data);
      allData = data.data || [];
      renderTable();
    } catch (error) {
      console.error('Error fetching housekeeping data:', error);
      tableBody.innerHTML = `<tr><td colspan="8" style="color:red;">Error loading housekeeping data: ${error.message}</td></tr>`;
    }
  };

  const calculateCleaningInfo = (lastCleaned, intervalDays) => {
    if (!lastCleaned) {
      return {
        nextDueStr: 'Overdue / Clean Now',
        daysRemaining: -9999,
        statusClass: 'status-overdue',
        statusText: 'Overdue',
        statusKey: 'overdue'
      };
    }

    const lastDate = new Date(lastCleaned);
    const dueDate = new Date(lastDate);
    dueDate.setDate(dueDate.getDate() + intervalDays);

    const today = new Date();
    // Reset hours to compare dates accurately
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let nextDueStr = '';
    try {
      const istOptions = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      };
      const formatter = new Intl.DateTimeFormat('en-IN', istOptions);
      const parts = formatter.formatToParts(dueDate);
      
      let day, month, year;
      parts.forEach(p => {
        if (p.type === 'day') day = p.value;
        if (p.type === 'month') month = p.value;
        if (p.type === 'year') year = p.value;
      });
      
      nextDueStr = `${day}-${month}-${year}`;
    } catch (e) {
      const dayStr = dueDate.getDate().toString().padStart(2, '0');
      const monthStr = (dueDate.getMonth() + 1).toString().padStart(2, '0');
      const yearStr = dueDate.getFullYear();
      nextDueStr = `${dayStr}-${monthStr}-${yearStr}`;
    }

    let statusClass = 'status-cleaned';
    let statusText = 'Cleaned';
    let statusKey = 'cleaned';

    if (diffDays < 0) {
      statusClass = 'status-overdue';
      statusText = 'Overdue';
      statusKey = 'overdue';
    } else if (diffDays <= 10) {
      statusClass = 'status-due';
      statusText = 'Due Soon';
      statusKey = 'due';
    }

    return {
      nextDueStr,
      daysRemaining: diffDays,
      statusClass,
      statusText,
      statusKey
    };
  };

  const renderTable = () => {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;

    tableBody.innerHTML = '';
    const query = searchInput.value.toLowerCase().trim();

    const filtered = allData.filter(item => {
      // 1. Filter by search query
      const flatStr = String(item.flatno).toLowerCase();
      const ownersStr = item.owners.map(o => o.issuedto || '').join(' ').toLowerCase();
      const matchesSearch = flatStr.includes(query) || ownersStr.includes(query);

      if (!matchesSearch) return false;

      // 2. Filter by tab status
      const info = calculateCleaningInfo(item.last_deep_cleaning, item.deep_cleaning_interval);
      if (currentFilter === 'all') return true;
      return info.statusKey === currentFilter;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9">No matching records found.</td></tr>`;
      return;
    }

    filtered.forEach((item) => {
      const info = calculateCleaningInfo(item.last_deep_cleaning, item.deep_cleaning_interval);
      const row = document.createElement('tr');
      row.className = info.statusClass;

      // Format last cleaned date with time in IST
      let lastCleanedFormatted = '-';
      if (item.last_deep_cleaning) {
        const d = new Date(item.last_deep_cleaning);
        try {
          const istOptions = {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          };
          const formatter = new Intl.DateTimeFormat('en-IN', istOptions);
          const parts = formatter.formatToParts(d);
          
          let day, month, year, hour, minute;
          parts.forEach(p => {
            if (p.type === 'day') day = p.value;
            if (p.type === 'month') month = p.value;
            if (p.type === 'year') year = p.value;
            if (p.type === 'hour') hour = p.value;
            if (p.type === 'minute') minute = p.value;
          });
          
          lastCleanedFormatted = `${day}-${month}-${year} ${hour}:${minute}`;
        } catch (e) {
          console.error('Error formatting date in IST:', e);
          lastCleanedFormatted = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
        }
      }

      // Format owners text
      const ownersList = item.owners.map(o => `${o.issuedto || 'Owner'} (${o.mobno || '-'})`).join('<br>');

      row.innerHTML = `
        <td style="text-align: center;"><input type="checkbox" class="flat-checkbox" data-flatno="${item.flatno}" style="margin: 0; cursor: pointer;"></td>
        <td><strong>Flat ${item.flatno}</strong></td>
        <td>${ownersList || 'No Owner'}</td>
        <td>${lastCleanedFormatted}</td>
        <td>
          ${item.deep_cleaning_interval}
          <span onclick="openIntervalModal(${item.flatno}, ${item.deep_cleaning_interval})" style="cursor: pointer; margin-left: 6px; color: #204060;" title="Edit Interval">&#9998;</span>
        </td>
        <td>${info.nextDueStr}</td>
        <td>${info.daysRemaining === -9999 ? 'Overdue' : info.daysRemaining}</td>
        <td><strong>${info.statusText}</strong></td>
        <td style="white-space: nowrap; text-align: center;">
          <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
            <span onclick="markDone(${item.flatno})" style="cursor: pointer; font-size: 1.25rem; color: #28a745;" title="Mark Done">&#10004;</span>
            ${item.deep_cleaning_history && item.deep_cleaning_history.length > 0 ? 
              `<span onclick="showHistory(${item.flatno})" style="cursor: pointer; font-size: 1.25rem; color: #007bff;" title="View History">&#128338;</span>` : ''}
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  };

  // Setup tab filter clicks
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter');
      renderTable();
    });
  });

  // Setup search input typing
  searchInput.addEventListener('input', renderTable);

  // Expose markDone to window scope for onclick binding
  window.markDone = async (flatno) => {
    const doubleCheck = confirm(`Are you sure you want to mark Flat ${flatno} as deep cleaned? This will update the last cleaning date to today and send WhatsApp alerts to whitelisted owners.`);
    if (!doubleCheck) return;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ flatno })
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/maintenance/housekeeping/deep-cleaning/done`,
        options
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update deep cleaning status');
      }
      
      let msg = `Successfully marked Flat ${flatno} as cleaned!`;
      if (data.data && data.data.whatsappLogs && data.data.whatsappLogs.length > 0) {
        const sentLogs = data.data.whatsappLogs.filter(l => l.status === 'sent');
        if (sentLogs.length > 0) {
          msg += ` Sent WhatsApp alerts to ${sentLogs.length} owner(s).`;
        }
      }
      alert(msg);
      fetchHousekeeping(); // reload data
    } catch (err) {
      console.error(err);
      alert(`Error marking deep cleaning done: ${err.message}`);
    }
  };

  let selectedFlatno = null;

  window.openIntervalModal = (flatno, currentInterval) => {
    selectedFlatno = flatno;
    document.getElementById('modalIntervalInput').value = currentInterval;
    document.getElementById('intervalModal').style.display = 'block';
  };

  document.getElementById('modalCancelBtn').addEventListener('click', () => {
    document.getElementById('intervalModal').style.display = 'none';
  });

  document.getElementById('modalSaveBtn').addEventListener('click', async () => {
    const interval = document.getElementById('modalIntervalInput').value;
    if (!interval || parseInt(interval) <= 0) {
      alert('Please enter a valid number of days');
      return;
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ flatno: selectedFlatno, interval: parseInt(interval) })
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/maintenance/housekeeping/deep-cleaning/interval`,
        options
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update interval');
      }

      document.getElementById('intervalModal').style.display = 'none';
      alert('Interval updated successfully!');
      fetchHousekeeping(); // reload data
    } catch (err) {
      console.error(err);
      alert(`Error updating interval: ${err.message}`);
    }
  });

  // History Modal Logic
  window.showHistory = (flatno) => {
    console.log('window.showHistory clicked for flatno:', flatno);
    const flat = allData.find(item => Number(item.flatno) === Number(flatno));
    console.log('Found flat record:', flat);
    if (!flat || !flat.deep_cleaning_history || flat.deep_cleaning_history.length === 0) {
      alert('No history found');
      return;
    }

    document.getElementById('historyModalTitleFlat').textContent = flatno;
    const tbody = document.getElementById('historyModalTableBody');
    tbody.innerHTML = '';

    flat.deep_cleaning_history.forEach(log => {
      const row = document.createElement('tr');
      const dateObj = new Date(log.cleaned_at);
      let dateStr = '-';
      try {
        const istOptions = {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        };
        const formatter = new Intl.DateTimeFormat('en-IN', istOptions);
        const parts = formatter.formatToParts(dateObj);
        let day, month, year, hour, minute;
        parts.forEach(p => {
          if (p.type === 'day') day = p.value;
          if (p.type === 'month') month = p.value;
          if (p.type === 'year') year = p.value;
          if (p.type === 'hour') hour = p.value;
          if (p.type === 'minute') minute = p.value;
        });
        dateStr = `${day}-${month}-${year} ${hour}:${minute}`;
      } catch (e) {
        dateStr = dateObj.toLocaleString();
      }

      row.innerHTML = `
        <td>${dateStr}</td>
        <td>${log.cleaned_by || '-'}</td>
      `;
      tbody.appendChild(row);
    });

    document.getElementById('historyModal').style.display = 'block';
  };

  document.getElementById('historyCloseBtn').addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
  });

  // Export Excel Logic
  window.exportToExcel = () => {
    const query = searchInput.value.toLowerCase().trim();

    const filtered = allData.filter(item => {
      // 1. Filter by search query
      const flatStr = String(item.flatno).toLowerCase();
      const ownersStr = item.owners.map(o => o.issuedto || '').join(' ').toLowerCase();
      const matchesSearch = flatStr.includes(query) || ownersStr.includes(query);

      if (!matchesSearch) return false;

      // 2. Filter by tab status
      const info = calculateCleaningInfo(item.last_deep_cleaning, item.deep_cleaning_interval);
      if (currentFilter === 'all') return true;
      return info.statusKey === currentFilter;
    });

    if (filtered.length === 0) {
      alert('No data to export.');
      return;
    }

    const exportData = filtered.map(item => {
      const info = calculateCleaningInfo(item.last_deep_cleaning, item.deep_cleaning_interval);
      let lastCleanedFormatted = '-';
      if (item.last_deep_cleaning) {
        const d = new Date(item.last_deep_cleaning);
        try {
          const istOptions = {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          };
          const formatter = new Intl.DateTimeFormat('en-IN', istOptions);
          const parts = formatter.formatToParts(d);
          let day, month, year, hour, minute;
          parts.forEach(p => {
            if (p.type === 'day') day = p.value;
            if (p.type === 'month') month = p.value;
            if (p.type === 'year') year = p.value;
            if (p.type === 'hour') hour = p.value;
            if (p.type === 'minute') minute = p.value;
          });
          lastCleanedFormatted = `${day}-${month}-${year} ${hour}:${minute}`;
        } catch (e) {
          lastCleanedFormatted = d.toLocaleString();
        }
      }

      const ownersList = item.owners.map(o => `${o.issuedto || 'Owner'} (${o.mobno || '-'})`).join(', ');

      return {
        flatno: `Flat ${item.flatno}`,
        owners: ownersList || 'No Owner',
        last_cleaned: lastCleanedFormatted,
        interval: `${item.deep_cleaning_interval} Days`,
        next_due: info.nextDueStr,
        days_remaining: info.daysRemaining === -9999 ? 'Overdue' : `${info.daysRemaining} Days`,
        status: info.statusText
      };
    });

    const colOrder = ['flatno', 'owners', 'last_cleaned', 'interval', 'next_due', 'days_remaining', 'status'];
    const labels = {
      flatno: 'Flat/Room No',
      owners: 'Owners (Whitelisted)',
      last_cleaned: 'Last Cleaned Date',
      interval: 'Cleaning Interval',
      next_due: 'Next Due Date',
      days_remaining: 'Days Remaining',
      status: 'Status'
    };

    if (typeof downloadExcelFromJSON === 'function') {
      downloadExcelFromJSON(exportData, `deep_cleaning_report_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Housekeeping', colOrder, labels);
    } else {
      alert('Excel export utility is not loaded.');
    }
  };

  // Select All Checkbox Handler
  const selectAllCheckboxEl = document.getElementById('selectAllCheckbox');
  if (selectAllCheckboxEl) {
    selectAllCheckboxEl.addEventListener('change', () => {
      const isChecked = selectAllCheckboxEl.checked;
      const checkboxes = document.querySelectorAll('.flat-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = isChecked;
      });
    });
  }

  // Bulk Clean Done Handler
  window.bulkMarkCleaned = async () => {
    const checkboxes = document.querySelectorAll('.flat-checkbox:checked');
    const flatnos = Array.from(checkboxes).map(cb => Number(cb.getAttribute('data-flatno')));

    if (flatnos.length === 0) {
      alert('Please select at least one flat to mark as cleaned.');
      return;
    }

    const doubleCheck = confirm(`Are you sure you want to mark ${flatnos.length} selected flat(s) as deep cleaned? This will update the cleaning date for all selected flats and trigger WhatsApp alerts to whitelisted owners.`);
    if (!doubleCheck) return;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ flatnos })
    };

    try {
      const response = await fetch(
        `${CONFIG.basePath}/maintenance/housekeeping/deep-cleaning/done`,
        options
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update deep cleaning status');
      }

      let msg = `Successfully marked ${flatnos.length} flat(s) as cleaned!`;
      if (data.data && data.data.whatsappLogs && data.data.whatsappLogs.length > 0) {
        const sentLogs = data.data.whatsappLogs.filter(l => l.status === 'sent');
        if (sentLogs.length > 0) {
          msg += ` Sent WhatsApp alerts to ${sentLogs.length} owner(s).`;
        }
      }
      alert(msg);
      fetchHousekeeping(); // reload data
    } catch (err) {
      console.error(err);
      alert(`Error marking deep cleaning done: ${err.message}`);
    }
  };

  fetchHousekeeping();
});
