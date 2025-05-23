function formatDate(dateInput) {
  let dateStr;

  if (typeof dateInput === "string") {
    dateStr = dateInput;
  } else if (dateInput instanceof Date) {
    dateStr = dateInput.toISOString().split("T")[0]; // Convert Date to YYYY-MM-DD string
  } else {
    console.warn("Invalid date input:", dateInput);
    return "";
  }

  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
}
