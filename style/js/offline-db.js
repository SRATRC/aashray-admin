// Lightweight, robust IndexedDB layer for offline validation, queueing, and Wi-Fi pools.
const OfflineDB = (() => {
  const DB_NAME = 'aashray_offline_scanner_db';
  const DB_VERSION = 1;

  let dbPromise = null;
  let cachedPendingCount = 0;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onblocked = () => {
        alert('Please close other scanner tabs to apply the database update.');
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 1. Attendees snapshot store
        if (!db.objectStoreNames.contains('attendees')) {
          const attendeeStore = db.createObjectStore('attendees', { keyPath: 'id' });
          attendeeStore.createIndex('module', 'module', { unique: false });
          attendeeStore.createIndex('cardno', 'cardno', { unique: false });
        }

        // 2. Dedicated Scan Queue store
        if (!db.objectStoreNames.contains('queues')) {
          const queueStore = db.createObjectStore('queues', { keyPath: 'localId' });
          queueStore.createIndex('queueName', 'queueName', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
        }

        // 3. Room bookings for Kiosk
        if (!db.objectStoreNames.contains('room_bookings')) {
          const roomStore = db.createObjectStore('room_bookings', { keyPath: 'bookingid' });
          roomStore.createIndex('cardno', 'cardno', { unique: false });
        }

        // 4. Wi-Fi voucher pool for Kiosk
        if (!db.objectStoreNames.contains('wifi_pool')) {
          const wifiStore = db.createObjectStore('wifi_pool', { keyPath: 'pwd_id' });
          wifiStore.createIndex('status', 'status', { unique: false });
        }

        // 5. Config store (PIN hash, active events)
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        const db = e.target.result;
        refreshPendingCount(db);
        resolve(db);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });

    return dbPromise;
  }

  function refreshPendingCount(db) {
    try {
      const tx = db.transaction('queues', 'readonly');
      const store = tx.objectStore('queues');
      const countReq = store.count();
      countReq.onsuccess = () => {
        cachedPendingCount = countReq.result || 0;
      };
    } catch (e) {}
  }

  // ----------------- CONFIG & PIN -----------------

  async function storeConfig(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('config', 'readwrite');
      tx.objectStore('config').put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getConfig(key) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('config', 'readonly');
      const req = tx.objectStore('config').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  }

  // ----------------- SNAPSHOT ATTENDEE DATA -----------------

  async function storeAttendees(moduleName, records, expiryDate) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendees', 'readwrite');
      const store = tx.objectStore('attendees');

      records.forEach((rec) => {
        const id = `${moduleName}_${rec.cardno}`;
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const existing = getReq.result;
          let mergedData = rec;
          if (existing && existing.data) {
            mergedData = { ...rec };
            // Preserve local offline food plate issue state
            if (moduleName === 'food') {
              if (existing.data.breakfast_plate_issued) mergedData.breakfast_plate_issued = true;
              if (existing.data.lunch_plate_issued) mergedData.lunch_plate_issued = true;
              if (existing.data.dinner_plate_issued) mergedData.dinner_plate_issued = true;
              if (existing.data.breakfast_issued_time) mergedData.breakfast_issued_time = existing.data.breakfast_issued_time;
              if (existing.data.lunch_issued_time) mergedData.lunch_issued_time = existing.data.lunch_issued_time;
              if (existing.data.dinner_issued_time) mergedData.dinner_issued_time = existing.data.dinner_issued_time;
            }
            // Preserve local offline utsav plate issue & checkin
            if (moduleName === 'utsav') {
              if (existing.data.issued_meals) {
                mergedData.issued_meals = { ...(rec.issued_meals || {}), ...existing.data.issued_meals };
              }
              if (existing.data.checkedin || existing.data.status === 'checkedin') {
                mergedData.checkedin = true;
                mergedData.status = 'checkedin';
              }
            }
            // Preserve local offline adhyayan attended sessions
            if (moduleName === 'adhyayan') {
              if (existing.data.attended_sessions) {
                mergedData.attended_sessions = [
                  ...new Set([...(rec.attended_sessions || []), ...existing.data.attended_sessions])
                ];
              }
            }
          }

          store.put({
            id,
            module: moduleName,
            cardno: rec.cardno,
            name: rec.name || 'Member',
            data: mergedData,
            expirationDate: expiryDate || null,
            updatedAt: Date.now()
          });
        };
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAttendee(moduleName, cardno) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('attendees', 'readonly');
      const store = tx.objectStore('attendees');
      const req = store.get(`${moduleName}_${cardno}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  // ----------------- FOOD LOCAL VALIDATION & MUTATION -----------------

  async function lookupAndMarkFood(cardno, meal) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendees', 'readwrite');
      const store = tx.objectStore('attendees');
      const req = store.get(`food_${cardno}`);

      req.onsuccess = () => {
        const entry = req.result;
        if (!entry || !entry.data) {
          return resolve({ valid: false, reason: 'not_found', message: `Card ${cardno} not found in today's meal roster.` });
        }

        const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        if (entry.expirationDate && entry.expirationDate !== todayIST) {
          return resolve({
            valid: false,
            reason: 'expired_roster',
            message: `Food roster expired (${entry.expirationDate}). Please update data online.`
          });
        }

        const booking = entry.data;
        const normalizedMeal = (meal || '').toLowerCase();

        // 1. Check if booked
        if (!booking[normalizedMeal]) {
          return resolve({ valid: false, reason: 'not_booked', message: `${normalizedMeal.toUpperCase()} not booked for ${entry.name}.`, name: entry.name });
        }

        // 2. Check if already issued
        const plateField = `${normalizedMeal}_plate_issued`;
        if (booking[plateField]) {
          const timeStr = booking[`${normalizedMeal}_issued_time`] ? ` at ${booking[`${normalizedMeal}_issued_time`]}` : '';
          return resolve({
            valid: false,
            reason: 'already_issued',
            message: `⚠️ Plate already issued for ${entry.name} (${normalizedMeal.toUpperCase()})${timeStr}`,
            name: entry.name
          });
        }

        // 3. Mark locally issued
        booking[plateField] = true;
        booking[`${normalizedMeal}_issued_time`] = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        entry.data = booking;
        store.put(entry);

        resolve({
          valid: true,
          name: entry.name,
          message: `Plate issued for ${entry.name}`
        });
      };

      req.onerror = () => reject(req.error);
    });
  }

  // ----------------- ADHYAYAN LOCAL ATTENDANCE & MUTATION -----------------

  async function lookupAndMarkAttendance(cardno, sessionNo) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendees', 'readwrite');
      const store = tx.objectStore('attendees');
      const req = store.get(`adhyayan_${cardno}`);

      req.onsuccess = () => {
        const entry = req.result;
        if (!entry || !entry.data) {
          return resolve({ valid: false, reason: 'not_found', message: `Card ${cardno} not found in Shibir roster.` });
        }

        const data = entry.data;
        data.attended_sessions = data.attended_sessions || {};

        if (data.attended_sessions[sessionNo]) {
          return resolve({
            valid: false,
            reason: 'already_attended',
            message: `⚠️ Attendance already marked for ${entry.name} for Session ${sessionNo}`,
            name: entry.name
          });
        }

        // Mark attended locally
        data.attended_sessions[sessionNo] = true;
        entry.data = data;
        store.put(entry);

        resolve({
          valid: true,
          name: entry.name,
          bookingid: data.bookingid,
          message: `Attendance marked for ${entry.name}`
        });
      };

      req.onerror = () => reject(req.error);
    });
  }

  // ----------------- UTSAV PLATE & CHECKIN MUTATION -----------------

  async function lookupAndMarkUtsavPlate(cardno, meal) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendees', 'readwrite');
      const store = tx.objectStore('attendees');
      const req = store.get(`utsav_${cardno}`);

      req.onsuccess = () => {
        const entry = req.result;
        if (!entry || !entry.data) {
          return resolve({ valid: false, reason: 'not_found', message: `Card ${cardno} not found in Utsav roster.` });
        }

        const data = entry.data;
        const normalizedMeal = (meal || 'lunch').toLowerCase();
        data.issued_meals = data.issued_meals || {};

        const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        const mealKey = `${todayIST}_${normalizedMeal}`;

        if (data.issued_meals[mealKey]) {
          return resolve({
            valid: false,
            reason: 'already_issued',
            message: `⚠️ Plate already issued for ${entry.name} (${normalizedMeal.toUpperCase()}) today`,
            name: entry.name
          });
        }

        data.issued_meals[mealKey] = true;
        entry.data = data;
        store.put(entry);

        resolve({
          valid: true,
          name: entry.name,
          package: data.package,
          message: `Plate issued for ${entry.name}`
        });
      };

      req.onerror = () => reject(req.error);
    });
  }

  async function lookupAndMarkUtsavCheckin(cardno) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendees', 'readwrite');
      const store = tx.objectStore('attendees');
      const req = store.get(`utsav_${cardno}`);

      req.onsuccess = () => {
        const entry = req.result;
        if (!entry || !entry.data) {
          return resolve({ valid: false, reason: 'not_found', message: `Card ${cardno} not found in Utsav participants.` });
        }

        const data = entry.data;
        if (data.status === 'checkedin' || data.checkedin) {
          return resolve({
            valid: false,
            reason: 'already_checkedin',
            message: `⚠️ ${entry.name} is already checked in for Utsav.`,
            name: entry.name
          });
        }

        data.checkedin = true;
        data.status = 'checkedin';
        entry.data = data;
        store.put(entry);

        resolve({
          valid: true,
          name: entry.name,
          package: data.package,
          bookingid: data.bookingid,
          message: `Check-in recorded for ${entry.name}`
        });
      };

      req.onerror = () => reject(req.error);
    });
  }

  // ----------------- ROOM KIOSK & WI-FI POOL -----------------

  async function storeKioskData(bookings, wifiPool) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['room_bookings', 'wifi_pool'], 'readwrite');
      const roomStore = tx.objectStore('room_bookings');
      const wifiStore = tx.objectStore('wifi_pool');

      bookings.forEach((b) => {
        const getReq = roomStore.get(b.bookingid);
        getReq.onsuccess = () => {
          const existing = getReq.result;
          // Don't overwrite locally checked-in or checked-out bookings if they were processed offline
          if (existing && (existing.status === 'checkedout' || (existing.status === 'checkedin' && b.status === 'pending_checkin'))) {
            return;
          }
          roomStore.put(b);
        };
      });

      wifiPool.forEach((w) => {
        const getReq = wifiStore.get(w.pwd_id);
        getReq.onsuccess = () => {
          // Don't resurrect vouchers that were handed out offline and not yet synced
          if (getReq.result && getReq.result.status === 'assigned') return;
          wifiStore.put({
            pwd_id: w.pwd_id,
            password: w.password,
            status: 'active',
            assignedCardno: null,
            assignedBookingid: null
          });
        };
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function lookupKioskBooking(cardno) {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('room_bookings', 'readonly');
      const index = tx.objectStore('room_bookings').index('cardno');
      const req = index.getAll(cardno);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async function consumeWifiVoucher(cardno, bookingid) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('wifi_pool', 'readwrite');
      const store = tx.objectStore('wifi_pool');
      const req = store.openCursor();

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          return resolve(null); // Pool empty
        }
        const row = cursor.value;
        if (row.status === 'active') {
          row.status = 'assigned';
          row.assignedCardno = cardno;
          row.assignedBookingid = bookingid;
          cursor.update(row);
          return resolve({ pwd_id: row.pwd_id, password: row.password });
        }
        cursor.continue();
      };

      req.onerror = () => reject(req.error);
    });
  }

  // ----------------- DEDICATED QUEUE MANAGER -----------------

  async function enqueueScan(queueName, payload) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queues', 'readwrite');
      const store = tx.objectStore('queues');

      const localId = `${payload.cardno || 'scan'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const record = {
        localId,
        queueName,
        cardno: payload.cardno,
        payload,
        scannedAt: payload.scannedAt || new Date().toISOString(),
        status: 'pending',
        retries: 0,
        createdAt: Date.now()
      };

      store.add(record);
      tx.oncomplete = () => {
        cachedPendingCount++;
        resolve(record);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getPendingScans(queueName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queues', 'readonly');
      const index = tx.objectStore('queues').index('queueName');
      const req = index.getAll(queueName);

      req.onsuccess = () => {
        const all = req.result || [];
        resolve(all.filter((item) => item.status === 'pending'));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function markScansSynced(localIds = []) {
    if (!localIds.length) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queues', 'readwrite');
      const store = tx.objectStore('queues');

      localIds.forEach((id) => store.delete(id));

      tx.oncomplete = () => {
        refreshPendingCount(db);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getPendingCount(queueName) {
    const items = await getPendingScans(queueName);
    return items.length;
  }

  function hasPendingScansSync() {
    return cachedPendingCount > 0;
  }

  // ----------------- HOUSEKEEPING & RESET -----------------

  async function purgeExpiredData() {
    const today = new Date().toISOString().split('T')[0];
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('attendees', 'readwrite');
      const store = tx.objectStore('attendees');
      const req = store.openCursor();

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const item = cursor.value;
          if (item.expirationDate && item.expirationDate < today) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
    });
  }

  async function resetStationCache() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const stores = ['attendees', 'queues', 'room_bookings', 'wifi_pool', 'config'];
      const tx = db.transaction(stores, 'readwrite');
      stores.forEach((s) => tx.objectStore(s).clear());
      tx.oncomplete = () => {
        cachedPendingCount = 0;
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    openDB,
    storeConfig,
    getConfig,
    storeAttendees,
    getAttendee,
    lookupAndMarkFood,
    lookupAndMarkAttendance,
    lookupAndMarkUtsavPlate,
    lookupAndMarkUtsavCheckin,
    storeKioskData,
    lookupKioskBooking,
    consumeWifiVoucher,
    enqueueScan,
    getPendingScans,
    getPendingCount,
    markScansSynced,
    hasPendingScansSync,
    purgeExpiredData,
    resetStationCache
  };
})();

window.OfflineDB = OfflineDB;
