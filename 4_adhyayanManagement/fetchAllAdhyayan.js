document.addEventListener('DOMContentLoaded', () => {
  const adhyayanListElement = document.getElementById('adhyayanList');

  const fetchAdhyayanList = async () => {
    console.log('In Backend Js: Fetching adhyayan data');
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      }
    };

    try {
      //ToDo: Update the URL
      var adhyayanList = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/adhyayan/fetch',
        options
      );
      console.log('Adhyayan Data received');
      const adhyayanData = await adhyayanList.json();
      console.log(adhyayanData);
      listAdhyayanData(adhyayanData);
    } catch (error) {
      console.error('Error fetching data: ' + error);
    }
  };

  const listAdhyayanData = (adhyayanData) => {
    const data = adhyayanData.data;
    console.log('Number of adhyayan recieved: ' + adhyayanData.data.length);
    console.log('Trying to print the data in table now');
    if (Array.isArray(data)) {
      const itemsToPrint = [
        'name',
        'speaker',
        'start_date',
        'end_date',
        'total_seats'
      ];
      console.log('Items array created: ' + itemsToPrint);
      var serialNumber = 1;
      data.forEach((item) => {
        console.log('Processing item: ');
        const tableRow = document.createElement('tr');
        const sNumberField = document.createElement('td');
        sNumberField.classList.add('table-bordered');
        sNumberField.style.textAlign = 'center';
        sNumberField.innerHTML = serialNumber++;
        tableRow.appendChild(sNumberField);
        var count = 0;
        for (const innerItem in item) {
          if (itemsToPrint.includes(`${innerItem}`)) {
            count++;
            const tableData = document.createElement('td');
            tableData.classList.add('table-bordered');
            tableData.style.textAlign = 'center';
            tableData.innerHTML = `${item[innerItem]}`;
            tableRow.appendChild(tableData);
          }
          if (count === 5) {
            count++;
            const adhyayanToEdit = `${item['id']}`;
            console.log('Adhyayan to Edit: ' + adhyayanToEdit);
            const lastCol = document.createElement('td');
            lastCol.classList.add('table-bordered');
            lastCol.style.textAlign = 'center';
            const editLink = document.createElement('a');
            editLink.href = `updateAdhyayan.html?id=${adhyayanToEdit}`;
            editLink.text = 'Edit';
            lastCol.appendChild(editLink);
            tableRow.appendChild(lastCol);
          }
        }
        adhyayanListElement.appendChild(tableRow);
      });
    }
  };

  fetchAdhyayanList();
});
