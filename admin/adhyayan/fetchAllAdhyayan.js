// document.addEventListener('DOMContentLoaded', () => {
//   const adhyayanListElement = document.getElementById('adhyayanList');

//   const fetchAdhyayanList = async () => {
//     console.log('In Backend Js: Fetching adhyayan data');
//     const options = {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${sessionStorage.getItem('token')}`
//       }
//     };

//     try {
//       //ToDo: Update the URL
//       var adhyayanList = await fetch(
//         'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/fetch',
//         options
//       );
//       console.log('Adhyayan Data received');
//       const adhyayanData = await adhyayanList.json();
//       console.log(adhyayanData);
//       listAdhyayanData(adhyayanData);
//     } catch (error) {
//       console.error('Error fetching data: ' + error);
//     }
//   };

//   const listAdhyayanData = (adhyayanData) => {
//     const data = adhyayanData.data;
//     console.log('Number of adhyayan recieved: ' + adhyayanData.data.length);
//     console.log('Trying to print the data in table now');
//     if (Array.isArray(data)) {
//       const itemsToPrint = [
//         'name',
//         'speaker',
//         'start_date',
//         'end_date',
//         'total_seats'
//       ];
//       console.log('Items array created: ' + itemsToPrint);
//       var serialNumber = 1;
//       data.forEach((item) => {
//         console.log('Processing item: ');
//         const tableRow = document.createElement('tr');
//         const sNumberField = document.createElement('td');
//         sNumberField.classList.add('table-bordered');
//         sNumberField.style.textAlign = 'center';
//         sNumberField.innerHTML = serialNumber++;
//         tableRow.appendChild(sNumberField);
//         var count = 0;
//         for (const innerItem in item) {
//           if (itemsToPrint.includes(`${innerItem}`)) {
//             count++;
//             const tableData = document.createElement('td');
//             tableData.classList.add('table-bordered');
//             tableData.style.textAlign = 'center';
//             tableData.innerHTML = `${item[innerItem]}`;
//             tableRow.appendChild(tableData);
//           }
//           if (count === 5) {
//             count++;
//             const adhyayanToEdit = `${item['id']}`;
//             console.log('Adhyayan to Edit: ' + adhyayanToEdit);
//             const lastCol = document.createElement('td');
//             lastCol.classList.add('table-bordered');
//             lastCol.style.textAlign = 'center';
//             const editLink = document.createElement('a');
//             editLink.href = `updateAdhyayan.html?id=${adhyayanToEdit}`;
//             editLink.text = 'Edit';
//             lastCol.appendChild(editLink);
//             tableRow.appendChild(lastCol);
//           }
//         }
//         adhyayanListElement.appendChild(tableRow);
//       });
//     }
//   };

//   fetchAdhyayanList();
// });

document.addEventListener('DOMContentLoaded', () => {
  const adhyayanListElement = document
    .getElementById('adhyayanList')
    .querySelector('tbody');

  const fetchAdhyayanList = async () => {
    console.log('Fetching adhyayan data...');
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/fetch',
        options
      );
      const adhyayanData = await response.json();
      console.log('Adhyayan Data received:', adhyayanData);
      populateTable(adhyayanData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const populateTable = (data) => {
    adhyayanListElement.innerHTML = ''; // Clear existing rows
    if (!Array.isArray(data) || data.length === 0) {
      adhyayanListElement.innerHTML =
        '<tr><td colspan="8" style="text-align:center;">No data available</td></tr>';
      return;
    }

    data.forEach((item, index) => {
      const tableRow = document.createElement('tr');

      tableRow.innerHTML = `
        <td style="text-align:center;">${index + 1}</td>
        <td style="text-align:center;">${item.name}</td>
        <td style="text-align:center;">${item.speaker}</td>
        <td style="text-align:center;">${item.start_date}</td>
        <td style="text-align:center;">${item.end_date}</td>
        <td style="text-align:center;">${item.total_seats}</td>
        <td style="text-align:center;">
          <button class="toggle-status" data-id="${item.id}" data-status="${
        item.status
      }">
            ${item.status === 'open' ? 'Close' : 'Open'}
          </button>
        </td>
        <td style="text-align:center;">
          <a href="updateAdhyayan.html?id=${item.id}">Edit</a>
        </td>
      `;

      adhyayanListElement.appendChild(tableRow);
    });

    // Attach event listeners to all status toggle buttons
    document.querySelectorAll('.toggle-status').forEach((button) => {
      button.addEventListener('click', toggleStatus);
    });
  };

  const toggleStatus = async (event) => {
    const button = event.target;
    const shibirId = button.dataset.id;
    const currentStatus = button.dataset.status;
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';

    if (
      !confirm(
        `Are you sure you want to ${
          newStatus === 'open' ? 'open' : 'closed'
        } this Adhyayan?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/${shibirId}/${newStatus}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(`Success: ${result.message}`);
        fetchAdhyayanList(); // Refresh table after update
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error updating status:', error);
    }
  };

  fetchAdhyayanList();
});
