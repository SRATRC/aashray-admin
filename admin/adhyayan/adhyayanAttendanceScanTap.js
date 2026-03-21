const params = new URLSearchParams(window.location.search);
const shibirId = params.get("shibir_id");
const sessionNo = params.get("session") || 1;

let isProcessing = false;
let focusInterval;
let submitTimer;

document.addEventListener("DOMContentLoaded", () => {
  const heading = document.getElementById("scanner-heading");
  const cardInput = document.getElementById("cardno");

  heading.innerText = `Tap card for Adhyayan Attendance (Session ${sessionNo})`;

  // Focus after load
  setTimeout(() => {
    cardInput.focus();
  }, 300);

  // Keep focus on scanner input
  focusInterval = setInterval(() => {
    if (document.activeElement !== cardInput) {
      cardInput.focus();
    }
  }, 500);

  // Main path: scanner sends Enter after scan
  cardInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();

      clearTimeout(submitTimer);

      // Small delay lets the final scanned character land in the input
      submitTimer = setTimeout(() => {
        const cardno = normalizeCardno(cardInput.value);

        if (cardno && !isProcessing) {
          markAttendance(cardno);
        }
      }, 80);
    }
  });

  // Fallback path: if scanner does not send Enter,
  // auto-submit after typing stops briefly
  cardInput.addEventListener("input", function () {
    clearTimeout(submitTimer);

    submitTimer = setTimeout(() => {
      const cardno = normalizeCardno(cardInput.value);

      if (cardno && !isProcessing) {
        markAttendance(cardno);
      }
    }, 120);
  });
});

function normalizeCardno(value) {
  let cardno = (value || "").trim();

  // Remove known prefix if scanner sends it
  cardno = cardno.replace(/^cardnumber=/i, "");

  // Remove line breaks / invisible trailing chars
  cardno = cardno.replace(/[\r\n]+/g, "");

  return cardno;
}

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

  const alertBox = document.getElementById("alert");
  const formWrapper = document.getElementById("formWrapper");
  const cardInput = document.getElementById("cardno");

  try {
    formWrapper.style.display = "none";

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
    const msg = data.message?.toLowerCase() || "";

    if (response.ok) {
      showAlert(alertBox, `Attendance marked for ${data.participantName}`, "success");
    } else if (msg.includes("already")) {
      showAlert(alertBox, data.message, "warning");
    } else {
      showAlert(alertBox, data.message || "Error marking attendance", "danger");
    }
  } catch (error) {
    showAlert(alertBox, "Unexpected error occurred", "danger");
  }

  setTimeout(() => {
    cardInput.value = "";
    resetAlert();
    cardInput.focus();
    isProcessing = false;
  }, 1000);
}