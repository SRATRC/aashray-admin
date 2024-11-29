async function assignCard(event) {
  event.preventDefault();

  // Collecting form data
  const cardno = document.querySelector('input[name="cardno"]').value;
  const issuedto = document.querySelector('input[name="issuedto"]').value;
  const gender = document.querySelector('select[name="gender"]').value;
  const dob = document.querySelector('input[name="dob"]').value;
  const mobno = document.querySelector('input[name="mobno"]').value;
  const email = document.querySelector('input[name="email"]').value;
  const idType = document.querySelector('select[name="idType"]').value;
  const idNo = document.querySelector('input[name="idNo"]').value;
  const address = document.querySelector('input[name="address"]').value;
  const city = document.querySelector('input[name="city"]').value;
  const state = document.querySelector('input[name="state"]').value;
  const pin = document.querySelector('input[name="pin"]').value;
  const centre = document.querySelector('input[name="centre"]').value;
  const resStatus = document.querySelector('select[name="res_status"]').value;
  const country = document.querySelector('input[name="country"]').value;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
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
      country: country,
      centre: centre,
      res_status: resStatus
    })
  };

  try {
    const response = await fetch(
      'https://sratrc-portal-backend-dev.onrender.com/api/v1/admin/card/create',
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
