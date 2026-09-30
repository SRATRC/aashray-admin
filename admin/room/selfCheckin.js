// Self check-in kiosk. Shared scanner/modal code lives in kioskCommon.js.
async function handleCheckin(cardno) {
  const { data, error } = await Kiosk.fetchBookings(cardno);
  if (error) {
    Kiosk.showResult(false, error.title, error.message);
    return;
  }

  const { room_booking = [], flat_booking = [], card_details = {} } = data;
  const guestName = card_details.issuedto || cardno;
  const today = Kiosk.todayIST();
  const coversToday = (b) => b.checkin <= today && b.checkout >= today;

  const targetRoomBooking = room_booking.find((b) => b.status === 'pending checkin' && coversToday(b));
  const targetFlatBooking = flat_booking.find((b) => b.status === 'pending checkin' && coversToday(b));

  if (!targetRoomBooking && !targetFlatBooking) {
    // Already checked in (overstays count — they are still in-house).
    const checkedinRoom = Kiosk.currentCheckedIn(room_booking, today);
    const checkedinFlat = Kiosk.currentCheckedIn(flat_booking, today);
    if (checkedinRoom || checkedinFlat) {
      const roomNum = [checkedinRoom?.roomno, checkedinFlat?.flatno].filter(Boolean).join(' & ') || '--';
      // Room number and WiFi code belong to the guest: show them only after
      // the person at the kiosk confirms the name is theirs.
      const ok = await Kiosk.confirm({
        question: 'Already checked in. Is this you?',
        guestName,
        confirmLabel: 'Yes, show my room'
      });
      if (!ok) return;
      const wifiCode = await Kiosk.fetchWifiCode(cardno);
      Kiosk.showResult(true, 'Already Checked In', `Guest ${guestName} is already checked into Room/Flat ${roomNum}.`, guestName, roomNum, wifiCode);
      return;
    }

    // A stay still awaiting payment is stored as plain 'pending'.
    const unpaid =
      room_booking.find((b) => b.status === 'pending' && coversToday(b)) ||
      flat_booking.find((b) => b.status === 'pending' && coversToday(b));
    if (unpaid) {
      Kiosk.showResult(
        false,
        'Payment Incomplete',
        `${guestName} has a stay booked for today, but payment is not complete. Please settle the payment before checking in.`
      );
      return;
    }

    Kiosk.showResult(false, 'No Pending Check-In', `No pending check-in found for ${guestName} today (${today}).`);
    return;
  }

  const units = [targetRoomBooking?.roomno || (targetRoomBooking && 'Room'), targetFlatBooking?.flatno || (targetFlatBooking && 'Flat')]
    .filter(Boolean)
    .join(' & ');
  const ok = await Kiosk.confirm({
    question: 'Check in?',
    guestName,
    roomNo: units,
    confirmLabel: 'Confirm Check-In'
  });
  if (!ok) return;

  const checkedInUnits = [];
  const failures = [];

  // A guest may hold both a room and a flat booking; process both.
  if (targetRoomBooking) {
    const r = await Kiosk.put(`/stay/checkin/${targetRoomBooking.bookingid}`);
    if (r.ok) checkedInUnits.push(targetRoomBooking.roomno || 'Room');
    else failures.push(r.message || 'Room check-in failed.');
  }
  if (targetFlatBooking) {
    const r = await Kiosk.put(`/stay/flat_checkin/${targetFlatBooking.bookingid}`);
    if (r.ok) checkedInUnits.push(targetFlatBooking.flatno || 'Flat');
    else failures.push(r.message || 'Flat check-in failed.');
  }

  if (checkedInUnits.length === 0) {
    Kiosk.showResult(false, 'Check-In Failed', failures.join(' '));
    return;
  }

  const wifiCode = await Kiosk.fetchWifiCode(cardno);
  const message = failures.length
    ? `Welcome, ${guestName}! Note: ${failures.join(' ')}`
    : `Welcome to Ashram Stay, ${guestName}!`;
  Kiosk.showResult(true, 'Check-In Successful!', message, guestName, checkedInUnits.join(' & '), wifiCode);
}

Kiosk.start({ handleCard: handleCheckin, beepHz: 880, beepSeconds: 0.15 });
