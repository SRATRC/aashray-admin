/* ===== GLOBAL QUICK MEMBER LOOKUP MODAL ===== */
(function () {
  let lookupModal = null;
  let debounceTimer = null;

  function initQuickLookup() {
    createLookupModal();
  }

  function createLookupModal() {
    if (document.getElementById('quickLookupModalOverlay')) return;

    lookupModal = document.createElement('div');
    lookupModal.id = 'quickLookupModalOverlay';
    lookupModal.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(5px);
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    lookupModal.innerHTML = `
      <div style="background:#ffffff; width:90%; max-width:540px; border-radius:18px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); border:1px solid #e2e8f0; animation: qlFadeIn 0.2s ease-out;">
        
        <div style="background:linear-gradient(135deg, #1e293b 0%, #334155 100%); color:#ffffff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:22px;">🔍</span>
            <div>
              <h3 style="margin:0; font-size:16px; font-weight:700; color:#ffffff;">Quick Member Snapshot Lookup</h3>
              <div style="font-size:11px; color:#cbd5e1;">Live instant lookup by Card No. or Mobile No.</div>
            </div>
          </div>
          <button type="button" onclick="closeQuickLookup()" style="background:none; border:none; color:#cbd5e1; font-size:24px; cursor:pointer; line-height:1;">&times;</button>
        </div>

        <div style="padding:20px;">
          <div style="display:flex; gap:8px; margin-bottom:16px;">
            <input type="text" id="quickLookupInput" placeholder="Type Card No. or 10-digit Mobile No. (e.g. C001 or 9876543210)..." style="flex:1; padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; font-size:13px; font-weight:600;" autofocus />
          </div>

          <div id="quickLookupResult" style="min-height:140px;">
            <div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:13px;">
              Type a card number or mobile number above to view live member snapshot.
            </div>
          </div>
        </div>

        <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:12px 20px; text-align:right;">
          <button type="button" onclick="closeQuickLookup()" class="btn btn-secondary" style="border-radius:8px; padding:6px 18px; font-weight:bold; font-size:12px;">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(lookupModal);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes qlFadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);

    // Live Instant Search Event Handler
    const inputEl = document.getElementById('quickLookupInput');
    if (inputEl) {
      inputEl.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(performMemberLookup, 250);
      });
    }

    lookupModal.addEventListener('click', (e) => {
      if (e.target === lookupModal) closeQuickLookup();
    });
  }

  window.openQuickLookup = function (query = '') {
    if (!lookupModal) createLookupModal();
    lookupModal.style.display = 'flex';
    const input = document.getElementById('quickLookupInput');
    if (input) {
      if (query) input.value = query;
      input.focus();
      performMemberLookup();
    }
  };

  window.closeQuickLookup = function () {
    if (lookupModal) lookupModal.style.display = 'none';
  };

  window.performMemberLookup = async function () {
    const inputVal = document.getElementById('quickLookupInput')?.value.trim();
    const resultDiv = document.getElementById('quickLookupResult');
    if (!resultDiv) return;

    if (!inputVal) {
      resultDiv.innerHTML = `
        <div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:13px;">
          Type a card number or mobile number above to view live member snapshot.
        </div>
      `;
      return;
    }

    resultDiv.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b; font-size:13px;">⏳ Searching member database...</div>`;

    try {
      let member = null;

      // 1. If 10-digit mobile number, try /card/by-mobile/:mob
      if (/^\d{10}$/.test(inputVal)) {
        try {
          const mobRes = await fetch(`${CONFIG.basePath}/card/by-mobile/${encodeURIComponent(inputVal)}`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          const mobData = await mobRes.json();
          if (mobRes.ok && mobData?.data) {
            member = mobData.data;
          }
        } catch (e) { console.warn('Mobile lookup error:', e); }
      }

      // 2. Try /card/:cardno
      if (!member) {
        try {
          const cardRes = await fetch(`${CONFIG.basePath}/card/${encodeURIComponent(inputVal)}`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          const cardData = await cardRes.json();
          if (cardRes.ok && cardData?.data) {
            member = cardData.data;
          }
        } catch (e) { console.warn('Card lookup error:', e); }
      }

      // 3. Try /gate/residents?search=:query
      if (!member) {
        try {
          const gateRes = await fetch(`${CONFIG.basePath}/gate/residents?search=${encodeURIComponent(inputVal)}`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
          });
          const gateData = await gateRes.json();
          if (gateRes.ok && gateData?.data?.residents?.length > 0) {
            member = gateData.data.residents[0];
          }
        } catch (e) { console.warn('Gate residents lookup error:', e); }
      }

      if (!member) {
        resultDiv.innerHTML = `
          <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:16px; text-align:center; color:#991b1b; font-size:13px;">
            ❌ No member record found for "<b>${inputVal}</b>".
          </div>
        `;
        return;
      }

      const memberName = member.issuedto || member.CardDb?.issuedto || member.name || 'Member';
      const cardNo = member.cardno || member.card_number || '—';
      const mobNo = member.mobno || member.CardDb?.mobno || member.mobile || '—';
      const isOnPrem = member.last_checkin_type === 'IN' || member.on_premises === true;
      const statusBadge = isOnPrem
        ? `<span style="background:#dcfce7; color:#166534; border:1px solid #bbf7d0; padding:3px 10px; border-radius:12px; font-weight:800; font-size:11px;">🟢 On Premises</span>`
        : `<span style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:3px 10px; border-radius:12px; font-weight:800; font-size:11px;">🔴 Off Premises</span>`;

      const categoryText = member.category || member.res_status || member.CardDb?.res_status || 'Member';
      const departmentVal = member.department || member.CardDb?.department || '';
      const roomVal = member.room_no || member.flatno || member.roomNo || '';

      let locationDetail = 'Main Ashram';
      if (departmentVal && roomVal) locationDetail = `${departmentVal} (${roomVal})`;
      else if (departmentVal) locationDetail = departmentVal;
      else if (roomVal) locationDetail = `Room: ${roomVal}`;

      resultDiv.innerHTML = `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; animation: qlFadeIn 0.15s ease-out;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:44px; height:44px; background:#4f46e5; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:bold;">
                ${memberName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 style="margin:0; font-size:16px; font-weight:700; color:#0f172a;">${memberName}</h4>
                <div style="font-size:12px; color:#64748b;">Card No: <b>${cardNo}</b> | Mobile: <b>${mobNo}</b></div>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; margin-top:12px;">
            <div style="background:#fff; border:1px solid #e2e8f0; padding:10px; border-radius:8px;">
              <div style="color:#64748b; font-size:11px; font-weight:700;">Category</div>
              <div style="font-weight:700; color:#1e293b; text-transform:uppercase; margin-top:2px;">${categoryText}</div>
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; padding:10px; border-radius:8px;">
              <div style="color:#64748b; font-size:11px; font-weight:700;">Location / Department</div>
              <div style="font-weight:700; color:#1e293b; margin-top:2px;">${locationDetail}</div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error(err);
      resultDiv.innerHTML = `<div style="color:#ef4444; text-align:center; padding:20px;">Error searching member database.</div>`;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickLookup);
  } else {
    initQuickLookup();
  }
})();
