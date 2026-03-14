const params = new URLSearchParams(window.location.search);
const shibirId = params.get("shibir_id");
const sessionNo = params.get("session") || 1;

let isProcessing = false;

document.addEventListener("DOMContentLoaded", () => {

  const heading = document.getElementById("scanner-heading");
  const cardInput = document.getElementById("cardno");

  heading.innerText = `Tap card for Adhyayan Attendance (Session ${sessionNo})`;

  // Force focus after page load
  setTimeout(() => {
    cardInput.focus();
  }, 300);

  // Prevent losing focus
  setInterval(() => {
    if (document.activeElement !== cardInput) {
      cardInput.focus();
    }
  }, 500);

  // Scanner usually sends ENTER
  cardInput.addEventListener("keydown", function (e) {

    if (e.key === "Enter") {
      e.preventDefault();

      const cardno = cardInput.value.trim();

      if (cardno && !isProcessing) {
        markAttendance(cardno);
      }
    }

  });

  // Backup: if scanner doesn't send ENTER
  cardInput.addEventListener("input", function () {

    const value = cardInput.value.trim();

    if (value.length >= 4 && !isProcessing) {
      setTimeout(() => {
        if (!isProcessing && cardInput.value.trim().length >= 4) {
          markAttendance(cardInput.value.trim());
        }
      }, 50);
    }

  });

});


function showAlert(element, message, type) {
  element.className = `big-alert alert-${type}`;
  element.textContent = message;
  element.style.display = "block";
}


function resetAlert() {

  const alertBox = document.getElementById("alert");
  const formWrapper = document.getElementById("formWrapper");

  alertBox.style.display = "none";
  alertBox.textContent = "";
  alertBox.className = "big-alert";
  formWrapper.style.display = "block";

}


async function markAttendance(cardno) {

  if (isProcessing) return;
  isProcessing = true;

  resetAlert();

  try {

    const response = await fetch(
      `${CONFIG.basePath}/adhyayan/attendance/${shibirId}/${sessionNo}/${cardno}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
      }
    );

    const data = await response.json();

    const alertBox = document.getElementById("alert");
    const formWrapper = document.getElementById("formWrapper");
    const cardInput = document.getElementById("cardno");

    formWrapper.style.display = "none";

    if (response.ok) {

      showAlert(
        alertBox,
        `Attendance marked for ${data.participantName}`,
        "success"
      );

    } else {

      let alertType = "danger";
      const msg = data.message?.toLowerCase() || "";

      if (msg.includes("already")) {
        alertType = "warning";
      }

      showAlert(alertBox, data.message || "Error marking attendance", alertType);

    }

    setTimeout(() => {

      cardInput.value = "";
      resetAlert();
      cardInput.focus();
      isProcessing = false;

    }, 1000);

  } catch (error) {

    const alertBox = document.getElementById("alert");
    const formWrapper = document.getElementById("formWrapper");
    const cardInput = document.getElementById("cardno");

    formWrapper.style.display = "none";

    showAlert(alertBox, "Unexpected error occurred", "danger");

    setTimeout(() => {

      resetAlert();
      cardInput.focus();
      isProcessing = false;

    }, 1000);

  }

}