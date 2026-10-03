function formatDate(dateInput) {
  if (!dateInput) return "";

  let dateStr;

  if (typeof dateInput === "string") {
    dateStr = dateInput;
  } else if (dateInput instanceof Date) {
    dateStr = dateInput.toISOString().split("T")[0];
  } else {
    console.warn("Invalid date input:", dateInput);
    return "";
  }

  const [year, month, day] = dateStr.split("-");

  if (!year || !month || !day) return "";

  return `${day}-${month}-${year}`;
}