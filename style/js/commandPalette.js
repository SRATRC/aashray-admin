/* ===== GLOBAL COMMAND PALETTE & QUICK LOOKUP (Ctrl + K / Alt + K) ===== */
(function () {
  let modalOverlay = null;

  function initCommandPalette() {
    createPaletteModal();

    // Capture keydown at the window capture phase to prevent Chrome omnibox hijacking
    window.addEventListener(
      'keydown',
      function (e) {
        const isCmdOrCtrl = e.ctrlKey || e.metaKey || e.altKey;
        if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          toggleCommandPalette();
          return false;
        } else if (e.key === 'Escape' && modalOverlay && modalOverlay.style.display === 'flex') {
          closeCommandPalette();
        }
      },
      true
    );
  }

  function createPaletteModal() {
    if (document.getElementById('cmdPaletteOverlay')) return;

    modalOverlay = document.createElement('div');
    modalOverlay.id = 'cmdPaletteOverlay';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(5px);
      z-index: 999999;
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding-top: 80px;
    `;

    modalOverlay.innerHTML = `
      <div style="background:#ffffff; width:90%; max-width:620px; border-radius:16px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.3); border:1px solid #e2e8f0; animation: cmdFadeIn 0.15s ease-out;">
        
        <!-- Header Search Bar -->
        <div style="display:flex; align-items:center; padding:14px 18px; border-bottom:1px solid #e2e8f0; background:#f8fafc; gap:12px;">
          <span style="font-size:18px; color:#64748b;">🔍</span>
          <input type="text" id="cmdPaletteInput" placeholder="Search page or type Card/Mobile No. to lookup..." style="flex:1; border:none; outline:none; background:transparent; font-size:15px; font-weight:600; color:#0f172a;" autofocus />
          <kbd style="background:#e2e8f0; color:#475569; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">ESC</kbd>
        </div>

        <!-- Palette Body List -->
        <div id="cmdPaletteResults" style="max-height:380px; overflow-y:auto; padding:10px 12px;">
          
          <div style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; padding:6px 10px 4px 10px;">Quick Navigation</div>
          
          <div class="cmd-item" onclick="window.location.href='/admin/gate/gateIn.html'">
            <span>🛡️ Gate Entry Check-In</span> <span class="cmd-tag">Gate</span>
          </div>
          <div class="cmd-item" onclick="window.location.href='/admin/gate/residents.html'">
            <span>👥 Gate Residents Directory</span> <span class="cmd-tag">Gate</span>
          </div>
          <div class="cmd-item" onclick="window.location.href='/admin/food/manageFood.html'">
            <span>🍽️ Food Booking & Plate Issuance</span> <span class="cmd-tag">Food</span>
          </div>
          <div class="cmd-item" onclick="window.location.href='/admin/maintenance/maintenance.html'">
            <span>🔧 Maintenance Requests</span> <span class="cmd-tag">Maintenance</span>
          </div>
          <div class="cmd-item" onclick="window.location.href='/admin/common/shortLinks.html'">
            <span>🔗 Short Link Management</span> <span class="cmd-tag">Common</span>
          </div>
          <div class="cmd-item" onclick="window.location.href='/admin/wifi/permanentCodeRequests.html'">
            <span>📶 WiFi Guest Pass Management</span> <span class="cmd-tag">WiFi</span>
          </div>
          <div class="cmd-item" onclick="window.location.href='/admin/card/index.html'">
            <span>🪪 RFID Card Management</span> <span class="cmd-tag">Card</span>
          </div>
        </div>

        <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:10px 16px; font-size:12px; color:#64748b; display:flex; justify-content:space-between; align-items:center;">
          <span>Press <kbd style="background:#e2e8f0; padding:1px 5px; border-radius:4px; font-weight:700;">Alt+K</kbd> or <kbd style="background:#e2e8f0; padding:1px 5px; border-radius:4px; font-weight:700;">Ctrl+K</kbd> to open</span>
          <span>Aashray Admin Portal</span>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    // Dynamic style injection
    const style = document.createElement('style');
    style.textContent = `
      @keyframes cmdFadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .cmd-item {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 14px; border-radius: 10px; cursor: pointer;
        font-size: 14px; font-weight: 600; color: #1e293b; transition: all 0.15s ease;
      }
      .cmd-item:hover {
        background: #f1f5f9; color: #2563eb; transform: translateX(2px);
      }
      .cmd-tag {
        font-size: 11px; background: #e0e7ff; color: #4338ca;
        padding: 2px 8px; border-radius: 6px; font-weight: 700;
      }
    `;
    document.head.appendChild(style);

    // Search filter input listener
    const inputEl = document.getElementById('cmdPaletteInput');
    if (inputEl) {
      inputEl.addEventListener('input', handleCmdSearch);
    }

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeCommandPalette();
    });
  }

  function handleCmdSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('cmdPaletteResults');
    if (!resultsContainer) return;

    if (!query) {
      resultsContainer.innerHTML = `
        <div style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; padding:6px 10px 4px 10px;">Quick Navigation</div>
        <div class="cmd-item" onclick="window.location.href='/admin/gate/gateIn.html'"><span>🛡️ Gate Entry Check-In</span> <span class="cmd-tag">Gate</span></div>
        <div class="cmd-item" onclick="window.location.href='/admin/gate/residents.html'"><span>👥 Gate Residents Directory</span> <span class="cmd-tag">Gate</span></div>
        <div class="cmd-item" onclick="window.location.href='/admin/food/manageFood.html'"><span>🍽️ Food Booking & Plate Issuance</span> <span class="cmd-tag">Food</span></div>
        <div class="cmd-item" onclick="window.location.href='/admin/maintenance/maintenance.html'"><span>🔧 Maintenance Requests</span> <span class="cmd-tag">Maintenance</span></div>
        <div class="cmd-item" onclick="window.location.href='/admin/common/shortLinks.html'"><span>🔗 Short Link Management</span> <span class="cmd-tag">Common</span></div>
        <div class="cmd-item" onclick="window.location.href='/admin/wifi/permanentCodeRequests.html'"><span>📶 WiFi Guest Pass Management</span> <span class="cmd-tag">WiFi</span></div>
        <div class="cmd-item" onclick="window.location.href='/admin/card/index.html'"><span>🪪 RFID Card Management</span> <span class="cmd-tag">Card</span></div>
      `;
      return;
    }

    const navItems = [
      { name: '🛡️ Gate Entry Check-In', url: '/admin/gate/gateIn.html', category: 'Gate' },
      { name: '👥 Gate Residents Directory', url: '/admin/gate/residents.html', category: 'Gate' },
      { name: '🍽️ Food Booking & Plate Issuance', url: '/admin/food/manageFood.html', category: 'Food' },
      { name: '🔧 Maintenance Requests', url: '/admin/maintenance/maintenance.html', category: 'Maintenance' },
      { name: '🔗 Short Link Management', url: '/admin/common/shortLinks.html', category: 'Common' },
      { name: '📶 WiFi Guest Pass Management', url: '/admin/wifi/permanentCodeRequests.html', category: 'WiFi' },
      { name: '🪪 RFID Card Management', url: '/admin/card/index.html', category: 'Card' }
    ];

    const filtered = navItems.filter(item => item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));

    let html = `<div style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; padding:6px 10px 4px 10px;">Matching Pages</div>`;

    if (filtered.length > 0) {
      filtered.forEach(item => {
        html += `<div class="cmd-item" onclick="window.location.href='${item.url}'"><span>${item.name}</span> <span class="cmd-tag">${item.category}</span></div>`;
      });
    } else {
      html += `<div style="padding:16px; text-align:center; color:#94a3b8; font-size:13px;">No pages matching "${query}".</div>`;
    }

    resultsContainer.innerHTML = html;
  }

  window.toggleCommandPalette = function () {
    if (!modalOverlay) createPaletteModal();
    if (modalOverlay.style.display === 'flex') {
      closeCommandPalette();
    } else {
      modalOverlay.style.display = 'flex';
      const inputEl = document.getElementById('cmdPaletteInput');
      if (inputEl) {
        inputEl.value = '';
        inputEl.focus();
        handleCmdSearch({ target: inputEl });
      }
    }
  };

  window.closeCommandPalette = function () {
    if (modalOverlay) modalOverlay.style.display = 'none';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommandPalette);
  } else {
    initCommandPalette();
  }
})();
