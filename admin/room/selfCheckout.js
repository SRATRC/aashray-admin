// Self check-out kiosk. Shared scanner/modal code lives in kioskCommon.js.
async function handleCheckout(cardno, fromScan = false) {
  const { data, error, handled } = await Kiosk.fetchBookings(cardno);
  if (handled) return;
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

  const units = [targetRoomBooking && (targetRoomBooking.roomno || 'Room'), targetFlatBooking && (targetFlatBooking.flatno || 'Flat')]
    .filter(Boolean)
    .join(' & ');
    const previews = [targetRoomBooking, targetFlatBooking].map((b) => b && b.checkout_preview).filter(Boolean);
  const lateFee = previews.reduce((sum, p) => sum + (Number(p.late_fee) || 0), 0);

  const creditItems = [];
  const creditPreviews = previews.filter((p) => Number(p.credit) > 0);
  if (creditPreviews.length > 0) {
    const thirdParty = creditPreviews.filter((p) => p.is_self_booked === false);
    const selfBooked = creditPreviews.filter((p) => p.is_self_booked !== false);

    if (selfBooked.length > 0) {
      const selfTotal = selfBooked.reduce((sum, p) => sum + Number(p.credit), 0);
      creditItems.push(`Early check-out: ₹${selfTotal} will be added to your credits.`);
    }

    if (thirdParty.length > 0) {
      const thirdPartyTotal = thirdParty.reduce((sum, p) => sum + Number(p.credit), 0);
      const bookerNames = [...new Set(thirdParty.map((p) => p.payer_name).filter(Boolean))];
      const bookerSuffix = bookerNames.length ? ` (${bookerNames.join(', ')})` : '';
      creditItems.push(`Early check-out: ₹${thirdPartyTotal} will be added to the booker's wallet${bookerSuffix}.`);
    }
  }

  const note = [
    lateFee > 0 && `Late check-out fee: ₹${lateFee}, to be paid in the Aashray App.`,
    ...creditItems
  ].filter(Boolean).join('\n');

  const bookerName = targetRoomBooking?.booker_name || targetFlatBooking?.booker_name;
  const ok = await Kiosk.confirm({
    question: 'Check out?',
    guestName,
    bookerName,
    roomNo: units,
    note,
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

  const hasRoom = Boolean(targetRoomBooking);
  const hasFlat = Boolean(targetFlatBooking);
  const badgeLabel = hasRoom && hasFlat
    ? 'Checked Out Room & Flat'
    : hasFlat
      ? 'Checked Out Flat'
      : 'Checked Out Room';

  let message = failures.length
    ? `Checked out of ${checkedOutUnits.join(' & ')}. Note: ${failures.join(' ')}`
    : `Thank you for visiting, ${guestName}! Have a safe journey.`;
  if (note) {
    message += `\n\n${note}`;
  }
  Kiosk.showResult(true, 'Check-Out Successful!', message, guestName, checkedOutUnits.join(' & '), null, badgeLabel);
}

Kiosk.start({ handleCard: handleCheckout, beepHz: 587.33, beepSeconds: 0.2 });
