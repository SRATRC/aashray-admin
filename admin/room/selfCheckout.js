// Self check-out kiosk. Shared scanner/modal code lives in kioskCommon.js.
async function handleCheckout(cardno) {
  const { data, error } = await Kiosk.fetchBookings(cardno);
  if (error) {
    Kiosk.showResult(false, error.title, error.message);
    return;
  }

  const { room_booking = [], flat_booking = [], card_details = {} } = data;
  const guestName = card_details.issuedto || cardno;
  const today = Kiosk.todayIST();

  // Any checked-in stay is checkout-eligible, including overstays past the planned date.
  const targetRoomBooking = Kiosk.currentCheckedIn(room_booking, today);
  const targetFlatBooking = Kiosk.currentCheckedIn(flat_booking, today);

  if (!targetRoomBooking && !targetFlatBooking) {
    Kiosk.showResult(false, 'Not Checked In', `Guest ${guestName} currently has no active checked-in room or flat.`);
    return;
  }

  // Checking out is not undoable at the kiosk: show whose stay this is first.
  const units = [targetRoomBooking && (targetRoomBooking.roomno || 'Room'), targetFlatBooking && (targetFlatBooking.flatno || 'Flat')]
    .filter(Boolean)
    .join(' & ');
  const ok = await Kiosk.confirm({
    question: 'Check out?',
    guestName,
    roomNo: units,
    confirmLabel: 'Confirm Check-Out'
  });
  if (!ok) return;

  const checkedOutUnits = [];
  const failures = [];

  // A guest may hold both a room and a flat booking; process both.
  if (targetRoomBooking) {
    const r = await Kiosk.put(`/stay/checkout/${targetRoomBooking.bookingid}`);
    if (r.ok) checkedOutUnits.push(targetRoomBooking.roomno || 'Room');
    else failures.push(r.message || 'Room check-out failed.');
  }
  if (targetFlatBooking) {
    const r = await Kiosk.put(`/stay/flat_checkout/${targetFlatBooking.bookingid}`);
    if (r.ok) checkedOutUnits.push(targetFlatBooking.flatno || 'Flat');
    else failures.push(r.message || 'Flat check-out failed.');
  }

  if (checkedOutUnits.length === 0) {
    Kiosk.showResult(false, 'Check-Out Failed', failures.join(' '));
    return;
  }

  const message = failures.length
    ? `Checked out of ${checkedOutUnits.join(' & ')}. Note: ${failures.join(' ')}`
    : `Thank you for visiting, ${guestName}! Have a safe journey.`;
  Kiosk.showResult(true, 'Check-Out Successful!', message, guestName, checkedOutUnits.join(' & '));
}

Kiosk.start({ handleCard: handleCheckout, beepHz: 587.33, beepSeconds: 0.2 });
