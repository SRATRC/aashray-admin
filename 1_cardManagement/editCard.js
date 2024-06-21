function editCard(event) {
  event.preventDefault();

  // Collecting form data
  const cardno = document.querySelector('input[name="cardno"]').value;
  const issuedto = document.querySelector('input[name="issuedto"]').value;
  const gender = document.querySelector('select[name="gender"]').value;
  const dob = document.querySelector('input[name="dob"]').value;
  const mobno = document.querySelector('input[name="phno"]').value;
  const email = document.querySelector('input[name="email"]').value;
  const idType = document.querySelector('select[name="idType"]').value;
  const idNo = document.querySelector('input[name="idNo"]').value;
  const address = document.querySelector('input[name="address"]').value;
  const city = document.querySelector('input[name="city"]').value;
  const state = document.querySelector('input[name="state"]').value;
  const pin = document.querySelector('input[name="pin"]').value;
  const centre = document.querySelector('select[name="centre"]').value;
  const status = document.querySelector('input[name="status"]').value;
  const resStatus = document.querySelector('select[name="res_status"]').value;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cardno: cardno,
      issuedto: issuedto,
      gender: gender,
      dob: dob,
      mobno: mobno,
      email: email,
      idType: idType,
      idNo: idNo,
      address: address,
      city: city,
      state: state,
      pin: pin,
      centre: centre,
      status: status,
      res_status: resStatus
    })
  };

  fetch(
    'https://sratrc-portal-backend-dev.onrender.com/api/v1/card/edit',
    options
  )
    .then((response) => response.json())
    .then((data) => {
      console.log(data); // Handle success response
      alert('Card edited successfully!');
      // Optionally, redirect to another page
      window.location.href = 'cardManagement.html';
    })
    .catch((error) => console.error('Error:', error));
}
