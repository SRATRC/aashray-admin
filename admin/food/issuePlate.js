async function foodCheckin(event) {
  event.preventDefault();

  // Collecting form data
  const cardno = document.querySelector('input[name="cardno"]').value;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    },
    body: JSON.stringify({
      cardno: cardno
    })
  };

  try {
    const response = await fetch(
      `https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/food/issue/${cardno}`,
      options
    );
    if (response.status >= 200 && response.status < 300) {
      const data = await response.json();
      console.log(data);
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }
  } catch (error) {
    alert(error.message);
  }
}
