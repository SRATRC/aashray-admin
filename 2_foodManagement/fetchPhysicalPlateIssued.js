// document.addEventListener('DOMContentLoaded', async function () {
//   try {
//     const response = await fetch(
//       'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/physicalPlates',
//       {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${sessionStorage.getItem('token')}`
//         }
//       }
//     );

//     const data = await response.json();
//     console.log(data);

//     if (response.ok) {
//       const plates = data.data;
//       const platesTableBody = document
//         .getElementById('physicalPlatesContainer')
//         .querySelector('tbody');

//       plates.forEach((plate) => {
//         const row = document.createElement('tr');
//         row.innerHTML = `
//           <td>${plate.date}</td>
//           <td>${plate.type}</td>
//           <td>${plate.count}</td>
//         `;
//         platesTableBody.appendChild(row);
//       });
//     } else {
//       console.error('Failed to fetch physical plates:', data.message);
//       alert('Failed to fetch physical plates.');
//     }
//   } catch (error) {
//     console.error('Error:', error);
//     alert('Error fetching physical plates.');
//   }
// });

document.addEventListener('DOMContentLoaded', async function () {
  const platesTableBody = document
    .getElementById('physicalPlatesContainer')
    .querySelector('tbody');

  const filterButton = document.getElementById('filterButton');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  const fetchPlatesData = async () => {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/physicalPlates',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      }
    );
    const data = await response.json();
    return data.data || [];
  };

  const filterDataByDateRange = (plates, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return plates.filter((plate) => {
      const plateDate = new Date(plate.date);
      return plateDate >= start && plateDate <= end;
    });
  };

  const renderTable = (plates) => {
    platesTableBody.innerHTML = '';
    const groupedData = plates.reduce((acc, plate) => {
      if (!acc[plate.date]) {
        acc[plate.date] = { breakfast: 0, lunch: 0, dinner: 0 };
      }
      acc[plate.date][plate.type.toLowerCase()] = plate.count;
      return acc;
    }, {});

    Object.keys(groupedData).forEach((date) => {
      const row = document.createElement('tr');
      const { breakfast, lunch, dinner } = groupedData[date];
      row.innerHTML = `
        <td>${date}</td>
        <td>${breakfast}</td>
        <td>${lunch}</td>
        <td>${dinner}</td>
      `;
      platesTableBody.appendChild(row);
    });
  };

  const loadPlates = async () => {
    const plates = await fetchPlatesData();
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const defaultFilteredPlates = filterDataByDateRange(
      plates,
      fifteenDaysAgo,
      new Date()
    );
    renderTable(defaultFilteredPlates);
  };

  filterButton.addEventListener('click', async () => {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }

    const plates = await fetchPlatesData();
    const filteredPlates = filterDataByDateRange(plates, startDate, endDate);
    renderTable(filteredPlates);
  });

  await loadPlates();
});
