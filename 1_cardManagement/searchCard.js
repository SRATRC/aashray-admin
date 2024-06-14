
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const dataList = document.getElementById('data-list');
   
  
    const fetchData = async () => {

        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem("token")}`
            },
            // body: JSON.stringify({
            //     page: 1,
            //     pageSize: 10,
            // })
        };

      try {
        const response = await fetch('https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/getAll', options); // Change this to your actual API endpoint
        const data = await response.json();
        console.log(data)
        displayData(data.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    const displayData = (data) => {
        // for (const key in data) {
        //     if (data.hasOwnProperty(key)) {
        //         const value = data[key];
        
        //         // Create a <li> element for each property and value
        //         const li = document.createElement('li');
        //         li.textContent = `${key}: ${value}`;
        
        //         // Append the <li> to the <ul>
        //         dataList.appendChild(li);
        //     }
        // }
            
        const dataList = document.getElementById('data-list');
        dataList.innerHTML = '';
        // data.forEach(item => {
        //     const li = document.createElement('li');
        //     li.textContent = `${item.id}: ${item.title}`;
        //     dataList.appendChild(li);
        // })
            if (Array.isArray(data)) {
                data.forEach(item => {
                    const div = document.createElement('div');
                    div.textContent = `Name: ${item.issuedto}, Gender: ${item.gender}`; // Adjust according to your data structure
                    dataList.appendChild(div);
                });
            } else if (typeof data === 'object' && data !== null) {
                // Handle case where data is a single object
                const div = document.createElement('div');
                div.textContent = `Name: ${data.issuedto}, Gender: ${data.gender}`; // Adjust according to your object structure
                dataList.appendChild(div);
            } else {
                // Handle other data types (null, undefined, primitive types)
                console.error('Unexpected data format:', data);
                const div = document.createElement('div');
                div.textContent = 'Data format not supported';
                dataList.appendChild(div);
            }
    };
  
    const filterData = async () => {
      try {
        const response = await fetch('https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/search/'+searchInput.value.toLowerCase(),{
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem("token")}`
        },
        }); // Change this to your actual API endpoint
        const data = await response.json();
        console.log(data);
        const div = document.createElement('div');
                div.textContent = `Name: ${data.data[0].issuedto}, Gender: ${data.data[0].gender}`; // Adjust according to your object structure
                dataList.appendChild(div);
        // const filteredData = data.filter(item =>
        //   item.name.toLowerCase().includes(searchTerm)
        // );
        // displayData(filteredData.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    searchInput.addEventListener('input', filterData);
  
    fetchData();
  });
  