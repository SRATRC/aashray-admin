// Express Check-In & Check-Out Unified Kiosk
// Shared scanner, overlays, and modal code live in kioskCommon.js.

async function handleUnified(cardno, fromScan = false) {
  const { data, error, handled } = await Kiosk.fetchBookings(cardno);
  if (handled) return;
  if (error) {
    Kiosk.showResult(false, error.title, error.message);
    return;
  }

  const { room_booking = [], flat_booking = [], card_details = {} } = data;
  const guestName = card_details.issuedto || cardno;
  const today = Kiosk.todayIST();

  // Active in-house stays
  const checkedinRoom = Kiosk.currentCheckedIn(room_booking, today);
  const checkedinFlat = Kiosk.currentCheckedIn(flat_booking, today);
  const hasCheckedInStay = Boolean(checkedinRoom || checkedinFlat);

  // Pending check-ins eligible today (checkin <= today <= checkout) where payment is fully settled
  const targetRoomCheckin = room_booking.find(
    (b) => b.status === 'pending checkin' && !b.has_unpaid_payment && b.checkin <= today && b.checkout >= today
  );
  const targetFlatCheckin = flat_booking.find(
    (b) => b.status === 'pending checkin' && !b.has_unpaid_payment && b.checkin <= today && b.checkout >= today
  );
  const hasPendingCheckinToday = Boolean(targetRoomCheckin || targetFlatCheckin);

  // Future pending check-in (checkin > today)
  const futurePending =
    room_booking.find((b) => b.status === 'pending checkin' && b.checkin > today) ||
    flat_booking.find((b) => b.status === 'pending checkin' && b.checkin > today);

  // Unpaid stay awaiting payment (either booking is in payment pending status OR has an unpaid transaction)
  const unpaidRoom = room_booking.find(
    (b) => (b.has_unpaid_payment || b.status === 'pending' || b.status === 'payment_pending') && b.checkout >= today
  );
  const unpaidFlat = flat_booking.find(
    (b) => (b.has_unpaid_payment || b.status === 'pending' || b.status === 'payment_pending') && b.checkout >= today
  );

  // -------------------------------------------------------------
  // BRANCH 1: Back-to-Back Stay / Room Change Day
  // Guest has an active in-house stay AND a pending check-in today
  // -------------------------------------------------------------
  if (hasCheckedInStay && hasPendingCheckinToday) {
    const currentUnit = [checkedinRoom?.roomno && `Room ${checkedinRoom.roomno}`, checkedinFlat?.flatno && `Flat ${checkedinFlat.flatno}`]
      .filter(Boolean)
      .join(' & ');
    const nextUnit = [targetRoomCheckin?.roomno && `Room ${targetRoomCheckin.roomno}`, targetFlatCheckin?.flatno && `Flat ${targetFlatCheckin.flatno}`]
      .filter(Boolean)
      .join(' & ');

    const choice = await Kiosk.confirmWithChoice({
      question: 'Room Change Detected: What would you like to do?',
      guestName,
      roomNo: currentUnit,
      choices: [
        { id: 'checkout', label: `Check Out of ${currentUnit || 'Current Stay'}`, theme: 'blue' },
        { id: 'checkin', label: `Check In to ${nextUnit || 'Next Stay'}`, theme: 'emerald' }
      ]
    });

    if (choice === 'checkout') {
      await executeCheckoutFlow({ checkedinRoom, checkedinFlat, guestName, today, isEarly: false });
    } else if (choice === 'checkin') {
      await executeCheckinFlow({ targetRoomBooking: targetRoomCheckin, targetFlatBooking: targetFlatCheckin, guestName, cardno });
    }
    return;
  }

  // -------------------------------------------------------------
  // BRANCH 2: In-House Guest (Check-Out or Safe Info Screen)
  // -------------------------------------------------------------
  if (hasCheckedInStay) {
    const activeStay = checkedinRoom || checkedinFlat;

    // Layer 2 Safeguard: Just Checked-In Grace Period (15 minutes)
    // Prevents an accidental immediate re-scan or double-tap from flipping to check-out
    const updatedAtMs = activeStay.updatedAt ? new Date(activeStay.updatedAt).getTime() : 0;
    const isWithin15MinGrace = updatedAtMs > 0 && Date.now() - updatedAtMs < 15 * 60 * 1000;

    if (isWithin15MinGrace) {
      const unitNum = [checkedinRoom?.roomno, checkedinFlat?.flatno].filter(Boolean).join(' & ');
      let wifiCode = null;
      if (checkedinRoom) {
        wifiCode = await Kiosk.fetchWifiCode(cardno);
      }
      Kiosk.showInfo({
        title: 'Welcome to Research Centre!',
        guestName,
        bookerName: activeStay.booker_name || null,
        roomNo: unitNum,
        roomLabel: checkedinRoom ? 'Assigned Room' : 'Assigned Flat',
        message: 'You checked in a few moments ago. Have a peaceful stay!',
        wifiCode,
        autoCloseSeconds: 8,
        doneBtnLabel: 'Done'
      });
      return;
    }

    // Layer 3 Safeguard: Scheduled Checkout Date Guard (Mid-Stay)
    // If today is BEFORE the scheduled checkout date, default to a safe info screen.
    // Early checkout requires clicking the secondary "Request Early Check-Out" button.
    const isScheduledCheckoutDay = today >= activeStay.checkout;

    if (!isScheduledCheckoutDay) {
      const unitNum = [checkedinRoom?.roomno, checkedinFlat?.flatno].filter(Boolean).join(' & ');
      let wifiCode = null;
      if (checkedinRoom) {
        wifiCode = await Kiosk.fetchWifiCode(cardno);
      }
      Kiosk.showInfo({
        title: 'Current Stay Active',
        guestName,
        bookerName: activeStay.booker_name || null,
        roomNo: unitNum,
        roomLabel: checkedinRoom ? 'Current Room' : 'Current Flat',
        message: `You are currently checked in until ${activeStay.checkout}. Have a blessed stay!`,
        wifiCode,
        autoCloseSeconds: 10,
        doneBtnLabel: 'Done',
        secondaryBtnLabel: 'Request Early Check-Out',
        onSecondaryBtn: () => {
          executeCheckoutFlow({ checkedinRoom, checkedinFlat, guestName, today, isEarly: true });
        }
      });
      return;
    }

    // On scheduled checkout day (or overstay): Proceed with standard checkout flow
    await executeCheckoutFlow({ checkedinRoom, checkedinFlat, guestName, today, isEarly: false });
    return;
  }

  // -------------------------------------------------------------
  // BRANCH 3: Pending Check-In for Today
  // -------------------------------------------------------------
  if (hasPendingCheckinToday) {
    await executeCheckinFlow({ targetRoomBooking: targetRoomCheckin, targetFlatBooking: targetFlatCheckin, guestName, cardno });
    return;
  }

  // -------------------------------------------------------------
  // BRANCH 4: No Current Active Stay or Eligible Check-In
  // -------------------------------------------------------------

  // Scenario A: Future confirmed booking (early arrival)
  if (futurePending) {
    Kiosk.showResult(
      false,
      'No Check-In for Today',
      `Welcome, ${guestName}! You have a confirmed reservation starting on ${futurePending.checkin}. Please return on your scheduled check-in date.`
    );
    return;
  }

  // Scenario B: Unpaid reservation
  if (unpaidFlat) {
    const flatNo = unpaidFlat.flatno ? `Flat ${unpaidFlat.flatno}` : 'Flat';
    const ownerName = unpaidFlat.owner_name || unpaidFlat.booker_name;
    const isOwner = Boolean(unpaidFlat.is_owner);

    let msg;
    if (isOwner) {
      msg = `Welcome, ${guestName}! Payment for ${flatNo} is pending. Please complete the payment in the Aashray App or visit the reception office before checking in.`;
    } else {
      const ownerSuffix = ownerName ? ` (Flat Owner: ${ownerName})` : '';
      msg = `Your stay at ${flatNo}${ownerSuffix} is pending payment. Flat charges must be settled by the flat owner in the Aashray App or at the reception office before check-in.`;
    }
    Kiosk.showResult(false, 'Payment Incomplete', msg);
    return;
  }

  if (unpaidRoom) {
    const bookerName = unpaidRoom.booker_name;
    const msg = bookerName
      ? `Welcome, ${guestName}! Your room reservation booked by ${bookerName} is pending payment. Please ask them to complete the payment in the Aashray App, or visit the reception office before checking in.`
      : `Welcome, ${guestName}! Your room reservation is pending payment. Please complete the payment in the Aashray App or visit the reception office before checking in.`;
    Kiosk.showResult(false, 'Payment Incomplete', msg);
    return;
  }

  // Scenario C: No reservation found today
  Kiosk.showResult(
    false,
    'No Active Reservation',
    `No active check-in or checked-in stay found for ${guestName} today (${today}). If you need assistance, please visit the reception counter.`
  );
}

// -----------------------------------------------------------------
// Check-In Flow Execution
// -----------------------------------------------------------------
async function executeCheckinFlow({ targetRoomBooking, targetFlatBooking, guestName, cardno }) {
  const bookerName = targetRoomBooking?.booker_name || targetFlatBooking?.booker_name;

  // Do not expose room numbers before check-in confirmation
  const ok = await Kiosk.confirm({
    question: 'Check in?',
    guestName,
    bookerName,
    confirmLabel: 'Confirm Check-In',
    theme: 'emerald'
  });
  if (!ok) return;

  const checkedInUnits = [];
  const failures = [];

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
      notes.push('A Wi-Fi code could not be issued. Please ask staff.');
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

// -----------------------------------------------------------------
// Check-Out Flow Execution
// -----------------------------------------------------------------
async function executeCheckoutFlow({ checkedinRoom, checkedinFlat, guestName, today, isEarly = false }) {
  const units = [checkedinRoom && (checkedinRoom.roomno || 'Room'), checkedinFlat && (checkedinFlat.flatno || 'Flat')]
    .filter(Boolean)
    .join(' & ');

  const previews = [checkedinRoom, checkedinFlat].map((b) => b && b.checkout_preview).filter(Boolean);
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

  const bookerName = checkedinRoom?.booker_name || checkedinFlat?.booker_name;

  let theme = 'blue';
  let confirmLabel = 'Confirm Check-Out';
  if (isEarly) {
    theme = 'indigo';
    const totalCredit = creditPreviews.reduce((s, p) => s + Number(p.credit), 0);
    confirmLabel = totalCredit > 0
      ? `Confirm Early Check-Out (Credit: ₹${totalCredit})`
      : 'Confirm Early Check-Out';
  } else if (lateFee > 0) {
    theme = 'amber';
    confirmLabel = `Acknowledge Fee (₹${lateFee}) & Check-Out`;
  }

  const ok = await Kiosk.confirm({
    question: isEarly ? 'Confirm Early Check-Out?' : 'Check out?',
    guestName,
    bookerName,
    roomNo: units,
    note,
    confirmLabel,
    theme
  });
  if (!ok) return;

  const checkedOutUnits = [];
  const failures = [];

  if (checkedinRoom) {
    const r = await Kiosk.put(`/stay/checkout/${checkedinRoom.bookingid}`);
    if (r.ok) checkedOutUnits.push(checkedinRoom.roomno || 'Room');
    else failures.push(r.message || 'Room check-out failed.');
  }
  if (checkedinFlat) {
    const r = await Kiosk.put(`/stay/flat_checkout/${checkedinFlat.bookingid}`);
    if (r.ok) checkedOutUnits.push(checkedinFlat.flatno || 'Flat');
    else failures.push(r.message || 'Flat check-out failed.');
  }

  if (checkedOutUnits.length === 0) {
    Kiosk.showResult(false, 'Check-Out Failed', failures.join(' '));
    return;
  }

  const hasRoom = Boolean(checkedinRoom);
  const hasFlat = Boolean(checkedinFlat);
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

// Start kiosk with neutral mid-range tone (740 Hz) for initial scan acknowledgement
Kiosk.start({ handleCard: handleUnified, beepHz: 740, beepSeconds: 0.15 });
