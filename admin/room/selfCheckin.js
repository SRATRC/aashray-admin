// Self check-in kiosk. Shared scanner/modal code lives in kioskCommon.js.
async function handleCheckin(cardno, fromScan = false) {
  const { data, error, handled } = await Kiosk.fetchBookings(cardno);
  if (handled) return;
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
    // Already checked in (overstays count - they are still in-house).
    const checkedinRoom = Kiosk.currentCheckedIn(room_booking, today);
    const checkedinFlat = Kiosk.currentCheckedIn(flat_booking, today);
    if (checkedinRoom || checkedinFlat) {
      const hasRoom = Boolean(checkedinRoom);
      const hasFlat = Boolean(checkedinFlat);
      const roomNum = [checkedinRoom?.roomno, checkedinFlat?.flatno].filter(Boolean).join(' & ') || '--';
      const bookerName = checkedinRoom?.booker_name || checkedinFlat?.booker_name;

      const confirmLabel = hasRoom
        ? (hasFlat ? 'Yes, show my stay & WiFi code' : 'Yes, show my room & WiFi code')
        : 'Yes, show my flat details';

      const ok = await Kiosk.confirm({
        question: 'Already checked in. Is this you?',
        guestName,
        bookerName,
        confirmLabel
      });
      if (!ok) return;

      if (hasRoom) {
        const wifiCode = await Kiosk.fetchWifiCode(cardno);
        const stayDesc = hasFlat
          ? `Room ${checkedinRoom.roomno} and Flat ${checkedinFlat.flatno}`
          : `Room ${checkedinRoom.roomno}`;
        const message = wifiCode
          ? `You are checked into ${stayDesc}.`
          : `You are checked into ${stayDesc}. A WiFi code could not be issued. Please ask staff.`;
        const title = hasFlat ? 'Your Stay & WiFi Code' : 'Your Room & WiFi Code';
        const badgeLabel = hasFlat ? 'Assigned Room & Flat' : 'Assigned Room';
        Kiosk.showResult(true, title, message, guestName, roomNum, wifiCode, badgeLabel);
      } else {
        // Flat only - no WiFi code system for flats
        const message = `You are checked into Flat ${checkedinFlat.flatno}.`;
        Kiosk.showResult(true, 'Your Flat Details', message, guestName, roomNum, null, 'Assigned Flat');
      }
      return;
    }

    // A stay still awaiting payment is stored as plain 'pending'.
    const unpaid =
      room_booking.find((b) => b.status === 'pending' && coversToday(b)) ||
      flat_booking.find((b) => b.status === 'pending' && coversToday(b));
    if (unpaid) {
      const msg = unpaid.booker_name
        ? `Your stay booked by ${unpaid.booker_name} is pending payment. Please ask them to complete the payment in the Aashray App or visit the office.`
        : `${guestName} has a stay booked for today, but payment is not complete. Please settle the payment before checking in.`;
      Kiosk.showResult(
        false,
        'Payment Incomplete',
        msg
      );
      return;
    }

    Kiosk.showResult(false, 'No Pending Check-In', `No pending check-in found for ${guestName} today (${today}).`);
    return;
  }

  const bookerName = targetRoomBooking?.booker_name || targetFlatBooking?.booker_name;

  // Do not show room number before check-in so guests cannot bypass check-in
  const ok = await Kiosk.confirm({
    question: 'Check in?',
    guestName,
    bookerName,
    confirmLabel: 'Confirm Check-In'
  });
  if (!ok) return;

  const checkedInUnits = [];
  const failures = [];

  // A guest may hold both a room and a flat booking; process both.
  if (targetRoomBooking) {
    const r = await Kiosk.put(`/stay/checkin/${targetRoomBooking.bookingid}`);
    if (r.ok) checkedInUnits.push({ type: 'room', no: targetRoomBooking.roomno || 'Room' });
    else failures.push(r.message || 'Room check-in failed.');
  }
  if (targetFlatBooking) {
    const r = await Kiosk.put(`/stay/flat_checkin/${targetFlatBooking.bookingid}`);
    if (r.ok) checkedInUnits.push({ type: 'flat', no: targetFlatBooking.flatno || 'Flat' });
    else failures.push(r.message || 'Flat check-in failed.');
  }

  if (checkedInUnits.length === 0) {
    Kiosk.showResult(false, 'Check-In Failed', failures.join(' '));
    return;
  }

  const hasRoom = checkedInUnits.some((u) => u.type === 'room');
  const hasFlat = checkedInUnits.some((u) => u.type === 'flat');
  const unitNumbers = checkedInUnits.map((u) => u.no).join(' & ');

  let wifiCode = null;
  const notes = [...failures];

  if (hasRoom) {
    wifiCode = await Kiosk.fetchWifiCode(cardno);
    if (!wifiCode) {
      notes.push('A WiFi code could not be issued. Please ask staff.');
    }
  }

  const badgeLabel = hasRoom && hasFlat
    ? 'Assigned Room & Flat'
    : hasFlat
      ? 'Assigned Flat'
      : 'Assigned Room';

  const message = notes.length
    ? `Welcome, ${guestName}! Note: ${notes.join(' ')}`
    : `Welcome to Ashram Stay, ${guestName}!`;

  Kiosk.showResult(true, 'Check-In Successful!', message, guestName, unitNumbers, wifiCode, badgeLabel);
}

Kiosk.start({ handleCard: handleCheckin, beepHz: 880, beepSeconds: 0.15 });
