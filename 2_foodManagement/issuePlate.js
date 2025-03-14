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
      console.log(data.message || 'Food issued successfully!');

      // Create and show a temporary success message
      const successMsg = document.createElement('div');
      successMsg.textContent = data.message || 'Food issued successfully!';
      successMsg.style.position = 'fixed';
      successMsg.style.top = '50%';
      successMsg.style.left = '50%';
      successMsg.style.transform = 'translate(-50%, -50%)';
      successMsg.style.background = 'green';
      successMsg.style.color = 'white';
      successMsg.style.padding = '10px 20px';
      successMsg.style.borderRadius = '5px';
      successMsg.style.zIndex = '1000';
      document.body.appendChild(successMsg);

      // Redirect after 1 second
      setTimeout(() => {
        window.location.href = 'issuePlate.html';
      }, 1000);
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }
  } catch (error) {
    console.error(error.message);
  }
}
