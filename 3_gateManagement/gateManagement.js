document.addEventListener('DOMContentLoaded', () => {
  const fetchData = async () => {
    try {
      const response = await fetch(
        'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/gate/total'
      ); // replace with your actual endpoint
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      displayData(data);
    } catch (error) {
      console.error(
        'There has been a problem with your fetch operation:',
        error
      );
    }
  };

  const displayData = (data) => {
    const cardDataDiv = document.getElementById('card-data');
    data.data.forEach((item) => {
      const p = document.createElement('p');
      p.textContent = `Status: ${item.res_status}, Count: ${item.count}`;
      cardDataDiv.appendChild(p);
    });
  };

  fetchData();
});
