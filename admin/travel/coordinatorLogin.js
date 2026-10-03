document.addEventListener(
  'DOMContentLoaded',
  () => {

    document
      .getElementById('sendOtpBtn')
      .addEventListener(
        'click',
        sendOtp
      );

    document
      .getElementById('verifyOtpBtn')
      .addEventListener(
        'click',
        verifyOtp
      );
  }
);

async function sendOtp() {

  try {

    const mobno =
      document
        .getElementById('mobno')
        .value
        .trim();

    if (!mobno) {
      alert('Enter mobile number');
      return;
    }

    const response = await fetch(

      `${CONFIG.baseUrl}/coordinator/send-otp`,

      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          mobno,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message
      );
    }

    alert(
      'OTP sent successfully'
    );

    document
      .getElementById(
        'otpSection'
      )
      .style.display = 'block';

  } catch (error) {

    alert(error.message);
  }
}

async function verifyOtp() {

  try {

    const mobno =
      document
        .getElementById('mobno')
        .value
        .trim();

    const otp =
      document
        .getElementById('otp')
        .value
        .trim();

    if (!otp) {
      alert('Enter OTP');
      return;
    }

    const response = await fetch(

      `${CONFIG.baseUrl}/coordinator/verify-otp`,

      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          mobno,
          otp,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message
      );
    }

    // STORE SESSION

    sessionStorage.setItem(
      'coordinatorToken',
      data.token
    );

    sessionStorage.setItem(
      'coordinatorUser',
      JSON.stringify(data.user)
    );

    alert(
      'Login successful'
    );

    window.location.href =
      'coordinatorDashboard.html';

  } catch (error) {

    alert(error.message);
  }
}