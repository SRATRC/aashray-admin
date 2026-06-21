let allMessages = [];
let activeJidFilter = null;
let customTemplates = [];
let composeMode = 'announcement'; // 'announcement' or 'poll'
let currentUploadedMedia = null; // { mediaUrl, mediaType, filename, mimetype }
let reconciliationData = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check if a JID was passed in the URL to pre-populate and filter
  const urlParams = new URLSearchParams(window.location.search);
  const jidParam = urlParams.get('jid');
  
  if (jidParam) {
    activeJidFilter = jidParam.trim();
    const jidInput = document.getElementById('broadcastGroupJid');
    if (jidInput) {
      jidInput.value = activeJidFilter;
    }
    const filterBadge = document.getElementById('activeFilterContainer');
    if (filterBadge) {
      filterBadge.style.display = 'block';
    }
    const auditBtn = document.getElementById('auditGroupMainBtn');
    if (auditBtn) {
      auditBtn.style.display = 'inline-flex';
    }
  }

  // Load message logs
  loadMessageHistory();
  loadFailedJobs();
  
  // Load custom templates
  loadCustomTemplates();

  // Initial preview update
  updateLivePreview();

  // Poll for message status updates and failed jobs every 7 seconds
  setInterval(() => {
    loadMessageHistory(true);
    loadFailedJobs(true);
  }, 7000);

  // Auto-open composer if jid param is provided in URL
  if (jidParam) {
    openComposerModal(jidParam.trim());
  }
});

// Modal Controller Logic
function openComposerModal(jid = '') {
  const modal = document.getElementById('composerModal');
  if (!modal) return;

  modal.classList.add('show');
  document.body.classList.add('modal-open');

  const targetJid = jid || activeJidFilter || '';
  const jidInput = document.getElementById('broadcastGroupJid');
  if (jidInput) {
    jidInput.value = targetJid;
    if (targetJid) {
      const msgInput = document.getElementById('broadcastMessage');
      if (msgInput) msgInput.focus();
    } else {
      jidInput.focus();
    }
  }

  // Add default poll option inputs
  const optionsList = document.getElementById('pollOptionsList');
  if (optionsList && optionsList.children.length === 0) {
    addPollOptionRow('Yes');
    addPollOptionRow('No');
  }

  updateLivePreview();
}

function closeComposerModal() {
  const modal = document.getElementById('composerModal');
  if (!modal) return;

  modal.classList.remove('show');
  document.body.classList.remove('modal-open');

  // Reset text inputs inside the modal
  const textInput = document.getElementById('broadcastMessage');
  if (textInput) textInput.value = '';

  // Reset attachments
  clearAttachment();

  // Reset poll question & options
  const pollQInput = document.getElementById('pollQuestion');
  if (pollQInput) pollQInput.value = '';
  const optionsList = document.getElementById('pollOptionsList');
  if (optionsList) optionsList.innerHTML = '';
  addPollOptionRow('Yes');
  addPollOptionRow('No');

  // Reset scheduler
  const schedCheckbox = document.getElementById('scheduleCheckbox');
  if (schedCheckbox) {
    schedCheckbox.checked = false;
    toggleScheduleInput(false);
  }

  // Keep target JID filtered if it exists
  const jidInput = document.getElementById('broadcastGroupJid');
  if (jidInput) {
    jidInput.value = activeJidFilter || '';
  }

  // Reset template selector
  const selector = document.getElementById('templateSelector');
  if (selector) selector.value = '';
  const deleteBtn = document.getElementById('deleteTemplateBtn');
  if (deleteBtn) deleteBtn.style.display = 'none';

  // Set compose mode back to announcement
  setComposeMode('announcement');

  updateLivePreview();

  // Strip query parameters from URL so refreshes don't reopen the modal
  if (window.location.search) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function handleBackdropClick(event) {
  if (event.target.id === 'composerModal') {
    closeComposerModal();
  }
}

// Global key listener for Escape key to close modal
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeComposerModal();
  }
});

// Load Sent Broadcast Logs from backend
async function loadMessageHistory(isSilent = false) {
  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  try {
    const res = await fetch(`${CONFIG.basePath}/whatsapp/messages`, { method: 'GET', headers });
    const result = await res.json();
    
    if (!res.ok) {
      throw new Error(result.message || 'Failed to fetch messages');
    }

    allMessages = result.data || [];
    renderMessagesTable();
  } catch (err) {
    console.error('Failed to load message history:', err);
    if (!isSilent) {
      showToast('Failed to load message log history', 'error');
      document.querySelector('#messagesTable tbody').innerHTML = `
        <tr><td colspan="5" style="text-align: center; color: red;">Failed to load messages.</td></tr>
      `;
    }
  }
}

// Render the message log records
function renderMessagesTable() {
  const tbody = document.querySelector('#messagesTable tbody');
  tbody.innerHTML = '';

  // Filter messages based on Active JID filter and search query
  const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
  
  let filtered = allMessages;

  if (activeJidFilter) {
    filtered = filtered.filter(msg => {
      const msgJid = msg.groupJid || (msg.payload && msg.payload.groupJid) || '';
      return msgJid.toLowerCase() === activeJidFilter.toLowerCase();
    });
  }

  if (searchQuery) {
    filtered = filtered.filter(msg => {
      const text = msg.payload && msg.payload.text ? msg.payload.text.toLowerCase() : '';
      const jid = (msg.groupJid || (msg.payload && msg.payload.groupJid) || '').toLowerCase();
      const groupName = msg.resolvedGroupName ? msg.resolvedGroupName.toLowerCase() : '';
      return text.includes(searchQuery) || jid.includes(searchQuery) || groupName.includes(searchQuery);
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">No broadcast history found.</td></tr>';
    return;
  }

  filtered.forEach(msg => {
    const row = document.createElement('tr');
    
    // Group target representation
    const targetJid = msg.groupJid || (msg.payload && msg.payload.groupJid) || '';
    const resolvedName = msg.resolvedGroupName;
    
    const targetHtml = resolvedName 
      ? `<strong>${resolvedName}</strong><br><code class="jid-code" style="font-size:0.75rem; padding: 2px 5px; opacity:0.8;">${targetJid}</code>`
      : `<code class="jid-code" style="font-size:0.78rem;">${targetJid}</code>`;

    // Message payload text
    const textContent = msg.payload && msg.payload.text ? msg.payload.text : '-';
    
    // Time formatting
    let timeStr = '-';
    const formatTime = (dateVal) => {
      return new Date(dateVal).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    if (msg.scheduledAt) {
      const scheduledTimeFormatted = formatTime(msg.scheduledAt);
      if (msg.status === 'pending' || msg.status === 'processing') {
        timeStr = `<span style="color:#ea580c; font-weight:600;" title="Scheduled Time">⏰ ${scheduledTimeFormatted}</span>`;
      } else {
        timeStr = `<span style="color:#475569;" title="Sent Time">${formatTime(msg.createdAt)}</span><br><span style="font-size:0.75rem; color:#94a3b8;">(Sched: ${scheduledTimeFormatted})</span>`;
      }
    } else if (msg.createdAt) {
      timeStr = `<span style="color:#475569;">${formatTime(msg.createdAt)}</span>`;
    }

    // Status Pill
    let statusHtml = '';
    let actionsHtml = '-';

    if (msg.status === 'success') {
      statusHtml = '<span class="msg-badge msg-success">Sent</span>';
    } else if (msg.status === 'failed') {
      const errorTitle = msg.error ? msg.error.replace(/"/g, '&quot;') : 'Unknown error';
      statusHtml = `<span class="msg-badge msg-failed" title="${errorTitle}" style="cursor:help;">Failed</span>`;
      
      // Let failed scheduled/broadcast messages also retry or reschedule
      actionsHtml = `
        <div style="display: flex; gap: 6px;">
          <button class="action-btn btn-retry" onclick="retryJob(${msg.id})" style="padding: 4px 8px; font-size:0.75rem;">
            Retry
          </button>
          <button class="action-btn btn-retry" onclick="openRescheduleModal(${msg.id}, '${msg.scheduledAt || ''}')" style="padding: 4px 8px; font-size:0.75rem; background-color:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;" title="Reschedule Broadcast">
            Reschedule
          </button>
        </div>
      `;
    } else {
      statusHtml = `<span class="msg-badge msg-pending">${msg.status}</span>`;
      
      // Actions for pending scheduled broadcasts
      actionsHtml = `
        <div style="display: flex; gap: 6px;">
          <button class="action-btn btn-retry" onclick="openRescheduleModal(${msg.id}, '${msg.scheduledAt || ''}')" style="padding: 4px 8px; font-size:0.75rem; background-color:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;" title="Reschedule Broadcast">
            Reschedule
          </button>
          <button class="action-btn btn-remove-action" onclick="cancelScheduledMessage(${msg.id})" style="padding: 4px 8px; font-size:0.75rem;" title="Cancel Broadcast">
            Cancel
          </button>
        </div>
      `;
    }

    row.innerHTML = `
      <td style="vertical-align: middle;">${targetHtml}</td>
      <td style="max-width: 250px; word-wrap: break-word; vertical-align: middle;">${escapeHtml(textContent)}</td>
      <td style="vertical-align: middle;">${timeStr}</td>
      <td style="vertical-align: middle;">${statusHtml}</td>
      <td style="vertical-align: middle;">${actionsHtml}</td>
    `;
    tbody.appendChild(row);
  });
}

// Send WhatsApp Broadcast Message (Announcement or Poll)
async function sendBroadcast(event) {
  event.preventDefault();

  const groupJid = document.getElementById('broadcastGroupJid').value.trim();
  const sendBtn = document.getElementById('sendBtn');

  if (!groupJid) {
    showToast('Please fill in the Target Group JID.', 'warning');
    return;
  }

  const payload = { groupJid, action: composeMode === 'poll' ? 'send_poll' : 'send_message' };

  // Handle Scheduler
  const isScheduled = document.getElementById('scheduleCheckbox').checked;
  if (isScheduled) {
    const scheduledTime = document.getElementById('scheduleTimeInput').value;
    if (!scheduledTime) {
      showToast('Please select a schedule date & time.', 'warning');
      return;
    }
    payload.scheduledAt = new Date(scheduledTime).toISOString();
  }

  if (composeMode === 'poll') {
    const pollQuestion = document.getElementById('pollQuestion').value.trim();
    const pollOptions = getPollOptionsValues();
    
    if (!pollQuestion) {
      showToast('Please enter a poll question.', 'warning');
      return;
    }
    if (pollOptions.length < 2) {
      showToast('Please provide at least 2 poll options.', 'warning');
      return;
    }
    payload.pollQuestion = pollQuestion;
    payload.pollOptions = pollOptions;
  } else {
    const text = document.getElementById('broadcastMessage').value.trim();
    if (!text && !currentUploadedMedia) {
      showToast('Please enter a message or attach media flyer.', 'warning');
      return;
    }
    payload.text = text;
    if (currentUploadedMedia) {
      payload.mediaUrl = currentUploadedMedia.mediaUrl;
      payload.mediaType = currentUploadedMedia.mediaType;
      payload.filename = currentUploadedMedia.filename;
      payload.mimetype = currentUploadedMedia.mimetype;
    }
  }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Queueing broadcast...';

  try {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${CONFIG.basePath}/whatsapp/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to queue broadcast');
    }

    showToast(`Broadcast queued successfully! Job ID: ${result.data.jobId}`, 'success');
    closeComposerModal();
    
    // Reload history to show the new pending message job
    loadMessageHistory(true);
  } catch (err) {
    console.error('Failed to send broadcast:', err);
    showToast(`Failed: ${err.message}`, 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Broadcast';
  }
}

// Filter handling
function handleFilter() {
  renderMessagesTable();
}

// Clear JID filter
function clearJidFilter() {
  activeJidFilter = null;
  const filterBadge = document.getElementById('activeFilterContainer');
  if (filterBadge) filterBadge.style.display = 'none';
  
  const auditBtn = document.getElementById('auditGroupMainBtn');
  if (auditBtn) auditBtn.style.display = 'none';
  
  // Clear input value if it matches the filtered JID
  const jidInput = document.getElementById('broadcastGroupJid');
  if (jidInput) jidInput.value = '';
  
  renderMessagesTable();
}

// Helper: Escape HTML to prevent injection issues in logs display
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Custom Premium Toast Notification Helper
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `wa-toast wa-toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else {
    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  // Trigger browser paint
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 50);

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Formatting Toolbar Selection Wrapper
function formatMessage(type) {
  const textarea = document.getElementById('broadcastMessage');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);

  let prefix = '';
  let suffix = '';

  if (type === 'bold') { prefix = '*'; suffix = '*'; }
  else if (type === 'italic') { prefix = '_'; suffix = '_'; }
  else if (type === 'strikethrough') { prefix = '~'; suffix = '~'; }
  else if (type === 'monospace') { prefix = '```'; suffix = '```'; }

  const replacement = prefix + selectedText + suffix;
  textarea.value = text.substring(0, start) + replacement + text.substring(end);

  // Set focus back and adjust cursor selection
  textarea.focus();
  if (selectedText.length > 0) {
    textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
  } else {
    textarea.setSelectionRange(start + prefix.length, start + prefix.length);
  }

  updateLivePreview();
}

// Emoji Insert Shortcut Helper
function insertEmoji(emoji) {
  insertTextAtCursor(emoji);
}

// Load templates from DB (backend API)
async function loadCustomTemplates() {
  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  try {
    const res = await fetch(`${CONFIG.basePath}/whatsapp/templates`, { method: 'GET', headers });
    const result = await res.json();
    
    if (!res.ok) {
      throw new Error(result.message || 'Failed to fetch templates');
    }

    customTemplates = result.data || [];
    renderTemplateChips();
  } catch (err) {
    console.error('Failed to load templates:', err);
    customTemplates = [];
    renderTemplateChips();
  }
}

// Render Custom Template Selector Options from DB
function renderTemplateChips() {
  const selector = document.getElementById('templateSelector');
  if (!selector) return;

  // Clear existing template options except the first placeholder option
  selector.innerHTML = '<option value="">-- Choose a template --</option>';

  customTemplates.forEach(tpl => {
    const opt = document.createElement('option');
    opt.value = tpl.id;
    opt.textContent = tpl.name;
    selector.appendChild(opt);
  });

  // Hide the delete button initially since no template is selected
  const deleteBtn = document.getElementById('deleteTemplateBtn');
  if (deleteBtn) deleteBtn.style.display = 'none';
}

// Handle Template Selection change
function handleTemplateSelect(selectElement) {
  const id = selectElement.value;
  const deleteBtn = document.getElementById('deleteTemplateBtn');

  if (!id) {
    if (deleteBtn) deleteBtn.style.display = 'none';
    return;
  }

  const tpl = customTemplates.find(t => t.id == id);
  if (tpl) {
    const textarea = document.getElementById('broadcastMessage');
    if (textarea) {
      textarea.value = tpl.text;
      updateLivePreview();
    }
    if (deleteBtn) deleteBtn.style.display = 'inline-flex';
  } else {
    if (deleteBtn) deleteBtn.style.display = 'none';
  }
}

// Add Custom Template Prompt & Save to DB
async function promptAddTemplate() {
  const currentMsg = document.getElementById('broadcastMessage').value.trim();
  if (!currentMsg) {
    showToast('Please type a message first, then click Save Current.', 'warning');
    return;
  }

  const name = prompt('Save your current message text as a template. Enter a name for this template:');
  if (!name || !name.trim()) return; // cancelled or empty

  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  try {
    const res = await fetch(`${CONFIG.basePath}/whatsapp/templates`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: name.trim(), text: currentMsg })
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Failed to save template');
    }

    showToast(`Template "${name}" saved successfully!`, 'success');
    loadCustomTemplates(); // reload templates
  } catch (err) {
    console.error('Failed to save template:', err);
    showToast(`Error saving template: ${err.message}`, 'error');
  }
}

// Delete Selected Template Trigger helper
async function handleTemplateDelete() {
  const selector = document.getElementById('templateSelector');
  if (!selector) return;

  const id = selector.value;
  if (!id) return;

  const tpl = customTemplates.find(t => t.id == id);
  const templateName = tpl ? tpl.name : 'this template';

  if (!confirm(`Are you sure you want to delete the template "${templateName}" from the database?`)) return;
  
  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  try {
    const res = await fetch(`${CONFIG.basePath}/whatsapp/templates/${id}`, {
      method: 'DELETE',
      headers
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Failed to delete template');
    }

    showToast(`Template "${templateName}" deleted.`, 'info');
    loadCustomTemplates(); // reload templates
  } catch (err) {
    console.error('Failed to delete template:', err);
    showToast(`Error deleting template: ${err.message}`, 'error');
  }
}

// Cursor Insertion Helper
function insertTextAtCursor(textToInsert) {
  const textarea = document.getElementById('broadcastMessage');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const currentVal = textarea.value;

  textarea.value = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
  textarea.focus();
  
  const newCursorPos = start + textToInsert.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);

  updateLivePreview();
}

// WhatsApp Syntax Parser (Bold, Italic, Strikethrough, Monospace)
function parseWhatsAppFormatting(text) {
  if (!text) return '';
  
  // Escape HTML to prevent injection and parse standard tags
  let parsed = escapeHtml(text);

  // 1. Monospace: ```code``` -> <code>code</code>
  parsed = parsed.replace(/```([^`]+)```/g, '<code>$1</code>');

  // 2. Bold: *text* -> <strong>text</strong>
  parsed = parsed.replace(/\*([^\s\*][^\*]*[^\s\*]|[^\s\*])\*/g, '<strong>$1</strong>');

  // 3. Italic: _text_ -> <em>text</em>
  parsed = parsed.replace(/_([^\s_][^_]*[^\s_]|[^\s_])_/g, '<em>$1</em>');

  // 4. Strikethrough: ~text~ -> <del>text</del>
  parsed = parsed.replace(/~([^\s~][^~]*[^\s~]|[^\s~])~/g, '<del>$1</del>');

  return parsed;
}

// Update Live WhatsApp chat preview bubble
function updateLivePreview() {
  const textarea = document.getElementById('broadcastMessage');
  const previewEmpty = document.getElementById('waPreviewEmpty');
  const previewBubble = document.getElementById('waPreviewBubble');
  const previewText = document.getElementById('waPreviewText');
  const previewTime = document.getElementById('waPreviewTime');
  const previewPoll = document.getElementById('waPreviewPoll');
  const previewPollQuestion = document.getElementById('waPreviewPollQuestion');
  const previewPollOptions = document.getElementById('waPreviewPollOptions');

  const previewMedia = document.getElementById('waPreviewBubbleMedia');
  const previewMediaImg = document.getElementById('waPreviewBubbleMediaImg');
  const previewMediaDoc = document.getElementById('waPreviewBubbleMediaDoc');
  const previewMediaDocName = document.getElementById('waPreviewBubbleMediaDocName');

  if (!textarea || !previewEmpty || !previewBubble || !previewText || !previewTime || !previewPoll) return;

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  previewTime.textContent = timeStr;

  if (composeMode === 'poll') {
    previewBubble.style.display = 'none';
    const pollQ = document.getElementById('pollQuestion').value.trim();
    const pollOpts = getPollOptionsValues();

    if (!pollQ && pollOpts.length === 0) {
      previewEmpty.style.display = 'block';
      previewPoll.style.display = 'none';
      return;
    }

    previewEmpty.style.display = 'none';
    previewPoll.style.display = 'block';
    previewPollQuestion.textContent = pollQ || 'Poll Question';
    
    previewPollOptions.innerHTML = '';
    const displayOpts = pollOpts.length > 0 ? pollOpts : ['Option 1', 'Option 2'];
    displayOpts.forEach((opt, idx) => {
      const optDiv = document.createElement('div');
      optDiv.style.display = 'flex';
      optDiv.style.alignItems = 'center';
      optDiv.style.gap = '10px';
      optDiv.style.padding = '8px 12px';
      optDiv.style.border = '1px solid #f1f5f9';
      optDiv.style.borderRadius = '8px';
      optDiv.style.background = '#f8fafc';
      
      optDiv.innerHTML = `
        <span style="width: 16px; height: 16px; border: 1.5px solid #cbd5e1; border-radius: 50%; display: inline-block; flex-shrink: 0;"></span>
        <span style="font-size: 0.88rem; color: #111b21; font-weight: 500; word-break: break-word;">${escapeHtml(opt)}</span>
      `;
      previewPollOptions.appendChild(optDiv);
    });

  } else {
    // Announcement message mode
    previewPoll.style.display = 'none';
    const rawText = textarea.value;

    if (!rawText.trim() && !currentUploadedMedia) {
      previewEmpty.style.display = 'block';
      previewBubble.style.display = 'none';
      return;
    }

    previewEmpty.style.display = 'none';
    previewBubble.style.display = 'block';

    // Parse and display formatted text
    previewText.innerHTML = parseWhatsAppFormatting(rawText);

    // Media attachment preview
    if (currentUploadedMedia && previewMedia && previewMediaImg && previewMediaDoc && previewMediaDocName) {
      previewMedia.style.display = 'block';
      const serverOrigin = new URL(CONFIG.baseUrl).origin;
      const fullMediaUrl = serverOrigin + currentUploadedMedia.mediaUrl;

      if (currentUploadedMedia.mediaType === 'image') {
        previewMediaImg.src = fullMediaUrl;
        previewMediaImg.style.display = 'block';
        previewMediaDoc.style.display = 'none';
      } else {
        previewMediaDocName.textContent = currentUploadedMedia.filename;
        previewMediaImg.style.display = 'none';
        previewMediaDoc.style.display = 'flex';
      }
    } else if (previewMedia) {
      previewMedia.style.display = 'none';
    }
  }
}

// Load Failed Queue Jobs list from backend
async function loadFailedJobs(isSilent = false) {
  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  try {
    const res = await fetch(`${CONFIG.basePath}/whatsapp/jobs/failed`, { method: 'GET', headers });
    const result = await res.json();
    
    if (!res.ok) {
      throw new Error(result.message || 'Failed to fetch failed jobs');
    }

    const failedJobs = result.data || [];
    populateFailedJobsTable(failedJobs);
  } catch (err) {
    console.error('Failed to load failed jobs:', err);
    if (!isSilent) {
      document.querySelector('#failedJobsTable tbody').innerHTML = `
        <tr><td colspan="4" style="text-align: center; color: red;">Failed to load failed jobs.</td></tr>
      `;
    }
  }
}

// Populate Failed Jobs Table
function populateFailedJobsTable(jobs) {
  const tbody = document.querySelector('#failedJobsTable tbody');
  tbody.innerHTML = '';

  const retryAllBtn = document.getElementById('retryAllBtn');
  if (jobs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No failed jobs found.</td></tr>';
    if (retryAllBtn) retryAllBtn.style.display = 'none';
    return;
  }

  if (retryAllBtn) retryAllBtn.style.display = 'block';

  jobs.forEach(job => {
    const row = document.createElement('tr');
    
    // Determine Target string
    let target = '-';
    if (job.phone) {
      target = `Phone: ${job.phone}`;
    } else if (job.groupJid) {
      target = `Group: ${job.groupJid}`;
    } else if (job.payload && job.payload.name) {
      target = `Group Name: ${job.payload.name}`;
    }

    const errorMsg = job.error ? `<span style="color:#d9534f; font-size:0.85rem;" title="${job.error}">${job.error.substring(0, 50)}${job.error.length > 50 ? '...' : ''}</span>` : '-';

    row.innerHTML = `
      <td><strong>${job.action}</strong></td>
      <td>${target}</td>
      <td>${errorMsg}</td>
      <td>
        <button class="action-btn btn-retry" onclick="retryJob(${job.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
          Retry
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Retry a specific job
async function retryJob(id) {
  if (!confirm(`Are you sure you want to retry job #${id}?`)) return;

  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  try {
    const res = await fetch(`${CONFIG.basePath}/whatsapp/jobs/retry/${id}`, {
      method: 'POST',
      headers
    });
    
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to retry job');

    showToast('Job queued for retry successfully!', 'success');
    loadFailedJobs(true);
  } catch (err) {
    console.error('Failed to retry job:', err);
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Retry all failed jobs
async function retryAll() {
  if (!confirm('Are you sure you want to retry ALL failed jobs?')) return;

  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  try {
    const res = await fetch(`${CONFIG.basePath}/whatsapp/jobs/retry-all`, {
      method: 'POST',
      headers
    });
    
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to retry jobs');

    showToast(`Successfully queued ${result.data.retriedCount} jobs for retry!`, 'success');
    loadFailedJobs(true);
  } catch (err) {
    console.error('Failed to retry all jobs:', err);
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Switch Compose Mode (Announcement vs Poll)
function setComposeMode(mode) {
  composeMode = mode;
  const tabAnn = document.getElementById('tabAnnouncement');
  const tabPl = document.getElementById('tabPoll');
  const annFields = document.getElementById('announcementFields');
  const pollFields = document.getElementById('pollFields');
  const msgInput = document.getElementById('broadcastMessage');
  const pollQInput = document.getElementById('pollQuestion');

  if (!tabAnn || !tabPl || !annFields || !pollFields) return;

  if (mode === 'poll') {
    tabAnn.classList.remove('active');
    tabPl.classList.add('active');
    annFields.style.display = 'none';
    pollFields.style.display = 'block';
    if (msgInput) msgInput.removeAttribute('required');
    if (pollQInput) pollQInput.setAttribute('required', 'true');
  } else {
    tabPl.classList.remove('active');
    tabAnn.classList.add('active');
    pollFields.style.display = 'none';
    annFields.style.display = 'block';
    if (pollQInput) pollQInput.removeAttribute('required');
    if (msgInput) msgInput.setAttribute('required', 'true');
  }

  updateLivePreview();
}

// Variable tag insertion at cursor in message textarea
function insertVariable(tag) {
  insertTextAtCursor(tag);
}

// Media file upload handler via FormData
async function handleAttachmentUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const previewContainer = document.getElementById('attachmentPreviewContainer');
  const filenameEl = document.getElementById('attachmentFilename');
  const progressEl = document.getElementById('attachmentProgress');
  const thumbnailEl = document.getElementById('attachmentThumbnail');
  const sendBtn = document.getElementById('sendBtn');

  if (!previewContainer || !filenameEl || !progressEl || !thumbnailEl || !sendBtn) return;

  // Show attachment preview in upload state
  previewContainer.style.display = 'flex';
  filenameEl.textContent = file.name;
  progressEl.textContent = 'Uploading media...';
  progressEl.style.color = '#eab308';
  sendBtn.disabled = true;

  if (file.type.startsWith('image/')) {
    thumbnailEl.textContent = '';
    const reader = new FileReader();
    reader.onload = (e) => {
      thumbnailEl.style.backgroundImage = `url('${e.target.result}')`;
    };
    reader.readAsDataURL(file);
  } else {
    thumbnailEl.style.backgroundImage = 'none';
    thumbnailEl.textContent = 'PDF';
  }

  try {
    const token = sessionStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${CONFIG.basePath}/whatsapp/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Media upload failed');

    currentUploadedMedia = {
      mediaUrl: result.data.mediaUrl,
      mediaType: result.data.mediaType,
      filename: result.data.filename,
      mimetype: result.data.mimetype
    };

    progressEl.textContent = 'Ready to send';
    progressEl.style.color = '#16a34a';
  } catch (err) {
    console.error('Failed to upload file:', err);
    showToast(`Upload failed: ${err.message}`, 'error');
    clearAttachment();
  } finally {
    sendBtn.disabled = false;
    updateLivePreview();
  }
}

// Clear currently selected media attachment
function clearAttachment() {
  currentUploadedMedia = null;
  const fileInput = document.getElementById('mediaAttachmentFile');
  if (fileInput) fileInput.value = '';

  const previewContainer = document.getElementById('attachmentPreviewContainer');
  if (previewContainer) previewContainer.style.display = 'none';

  updateLivePreview();
}

// Toggle scheduled date & time datetime picker visibility
function toggleScheduleInput(checked) {
  const container = document.getElementById('scheduleTimeContainer');
  const timeInput = document.getElementById('scheduleTimeInput');
  if (!container || !timeInput) return;

  if (checked) {
    container.style.display = 'block';
    // Set default schedule time to 5 mins from now
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    // Format to yyyy-MM-ddThh:mm for datetime-local input
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  } else {
    container.style.display = 'none';
    timeInput.value = '';
  }
}

// Dynamically add a poll option input row
function addPollOptionRow(val = '') {
  const optionsList = document.getElementById('pollOptionsList');
  if (!optionsList) return;

  const count = optionsList.children.length;
  if (count >= 5) {
    showToast('You can add a maximum of 5 poll options.', 'warning');
    return;
  }

  const row = document.createElement('div');
  row.className = 'poll-option-row';
  row.style.display = 'flex';
  row.style.gap = '8px';
  row.style.alignItems = 'center';

  row.innerHTML = `
    <input type="text" class="form-control poll-option-input" placeholder="Option ${count + 1}" value="${val}" oninput="updateLivePreview()" required />
    <button type="button" class="btn btn-secondary" onclick="this.parentElement.remove(); updateLivePreview();" style="padding: 10px 14px; margin: 0; color: #ef4444; border-color: #fecaca; background-color: #fef2f2; display: flex; align-items: center; justify-content: center;" title="Remove Option">
      ✕
    </button>
  `;

  optionsList.appendChild(row);
  updateLivePreview();
}

// Retrieve values from all poll option rows
function getPollOptionsValues() {
  const inputs = document.querySelectorAll('.poll-option-input');
  const values = [];
  inputs.forEach(input => {
    const val = input.value.trim();
    if (val) values.push(val);
  });
  return values;
}

// Open secondary Audit Reconciliation modal
function openAuditModal(jid = '') {
  const targetJid = jid || document.getElementById('broadcastGroupJid').value.trim() || activeJidFilter || '';
  if (!targetJid) {
    showToast('Please enter or filter by a Target Group JID first.', 'warning');
    return;
  }

  const modal = document.getElementById('auditModal');
  if (!modal) return;

  document.getElementById('auditGroupJidVal').textContent = targetJid;
  modal.classList.add('show');
  document.body.classList.add('modal-open');

  runReconciliationAudit();
}

// Close secondary Audit Reconciliation modal
function closeAuditModal() {
  const modal = document.getElementById('auditModal');
  if (!modal) return;

  modal.classList.remove('show');
  if (!document.getElementById('composerModal').classList.contains('show')) {
    document.body.classList.remove('modal-open');
  }
}

function handleAuditBackdropClick(event) {
  if (event.target.id === 'auditModal') {
    closeAuditModal();
  }
}

// Run members audit reconciliation via DB-RPC queue
async function runReconciliationAudit() {
  const groupJid = document.getElementById('auditGroupJidVal').textContent.trim();
  const loading = document.getElementById('auditLoading');
  const results = document.getElementById('auditResults');
  const runBtn = document.getElementById('runAuditBtn');

  if (!groupJid || !loading || !results || !runBtn) return;

  loading.style.display = 'block';
  results.style.display = 'none';
  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="loading-spinner"></span> Auditing...';

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/whatsapp/groups/${encodeURIComponent(groupJid)}/reconciliation`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Audit check failed');

    reconciliationData = result.data || { matched: [], missing: [], extra: [] };

    // Update counts
    document.getElementById('countMatched').textContent = reconciliationData.matched.length;
    document.getElementById('countMissing').textContent = reconciliationData.missing.length;
    document.getElementById('countExtra').textContent = reconciliationData.extra.length;

    // Render lists
    renderAuditLists();

    loading.style.display = 'none';
    results.style.display = 'block';
  } catch (err) {
    console.error('Audit failed:', err);
    showToast(`Audit failed: ${err.message}`, 'error');
    closeAuditModal();
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-top: -2px; margin-right: 4px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
      Re-Run Audit
    `;
  }
}

// Render members into Matched, Missing and Extra lists
function renderAuditLists() {
  const tbodyMatched = document.querySelector('#tableMatched tbody');
  const tbodyMissing = document.querySelector('#tableMissing tbody');
  const tbodyExtra = document.querySelector('#tableExtra tbody');

  tbodyMatched.innerHTML = '';
  tbodyMissing.innerHTML = '';
  tbodyExtra.innerHTML = '';

  const { matched, missing, extra } = reconciliationData;

  // Matched
  if (matched.length === 0) {
    tbodyMatched.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #888; padding: 20px;">No matched members.</td></tr>';
  } else {
    matched.forEach(m => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${escapeHtml(m.issuedto)}</strong></td>
        <td><code class="jid-code" style="font-size:0.75rem;">${escapeHtml(m.cardno)}</code></td>
        <td>+${m.phone}</td>
      `;
      tbodyMatched.appendChild(row);
    });
  }

  // Missing
  if (missing.length === 0) {
    tbodyMissing.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888; padding: 20px;">No missing members. All confirmed bookings are in the group.</td></tr>';
    document.getElementById('syncAddAllBtn').style.display = 'none';
  } else {
    document.getElementById('syncAddAllBtn').style.display = 'block';
    missing.forEach(m => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${escapeHtml(m.issuedto)}</strong></td>
        <td><code class="jid-code" style="font-size:0.75rem;">${escapeHtml(m.cardno)}</code></td>
        <td>+${m.phone}</td>
        <td>
          <button type="button" class="btn-sync-action" onclick="syncSingleMember('add', '${m.phone}', '${m.issuedto}')">
            Add to Group
          </button>
        </td>
      `;
      tbodyMissing.appendChild(row);
    });
  }

  // Extra
  if (extra.length === 0) {
    tbodyExtra.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888; padding: 20px;">No extra members found.</td></tr>';
    document.getElementById('syncRemoveAllBtn').style.display = 'none';
  } else {
    document.getElementById('syncRemoveAllBtn').style.display = 'block';
    extra.forEach(m => {
      const row = document.createElement('tr');
      const cardNoText = m.cardno ? `<code class="jid-code" style="font-size:0.75rem;">${escapeHtml(m.cardno)}</code>` : '<span style="color:#aaa; font-style:italic;">Not registered</span>';
      row.innerHTML = `
        <td><strong>${escapeHtml(m.issuedto)}</strong></td>
        <td>${cardNoText}</td>
        <td>+${m.phone}</td>
        <td>
          <button type="button" class="btn-remove-action" onclick="syncSingleMember('remove', '${m.phone}', '${m.issuedto}')">
            Remove
          </button>
        </td>
      `;
      tbodyExtra.appendChild(row);
    });
  }
}

// Sync a single member JID addition or removal
async function syncSingleMember(actionType, phone, name) {
  const groupJid = document.getElementById('auditGroupJidVal').textContent.trim();
  if (!confirm(`Are you sure you want to queue "${actionType}" action for ${name} (+${phone})?`)) return;

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/whatsapp/groups/${encodeURIComponent(groupJid)}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        actions: [{ action: actionType, phone }]
      })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Sync action failed');

    showToast(`Sync job queued successfully for ${name}!`, 'success');
    
    // Automatically re-trigger audit after 1 second so the queue shows it's processing
    setTimeout(runReconciliationAudit, 1000);
  } catch (err) {
    console.error('Sync failed:', err);
    showToast(`Sync failed: ${err.message}`, 'error');
  }
}

// Sync all missing members in one click
async function syncAllMissing() {
  const { missing } = reconciliationData;
  if (!missing || missing.length === 0) return;

  if (!confirm(`Are you sure you want to queue group ADD jobs for all ${missing.length} missing members?`)) return;

  const groupJid = document.getElementById('auditGroupJidVal').textContent.trim();
  const actions = missing.map(m => ({ action: 'add', phone: m.phone }));

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/whatsapp/groups/${encodeURIComponent(groupJid)}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ actions })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Sync failed');

    showToast(`Queued ADD jobs for all ${missing.length} missing members!`, 'success');
    setTimeout(runReconciliationAudit, 1000);
  } catch (err) {
    console.error('Batch sync failed:', err);
    showToast(`Sync failed: ${err.message}`, 'error');
  }
}

// Sync all extra members in one click
async function syncAllExtra() {
  const { extra } = reconciliationData;
  if (!extra || extra.length === 0) return;

  if (!confirm(`Are you sure you want to queue group REMOVE jobs for all ${extra.length} extra members?`)) return;

  const groupJid = document.getElementById('auditGroupJidVal').textContent.trim();
  const actions = extra.map(m => ({ action: 'remove', phone: m.phone }));

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/whatsapp/groups/${encodeURIComponent(groupJid)}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ actions })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Sync failed');

    showToast(`Queued REMOVE jobs for all ${extra.length} extra members!`, 'success');
    setTimeout(runReconciliationAudit, 1000);
  } catch (err) {
    console.error('Batch sync failed:', err);
    showToast(`Sync failed: ${err.message}`, 'error');
  }
}

// Switch between Matched, Missing, and Extra tabs in auditResults
function switchAuditTab(tab) {
  document.querySelectorAll('.audit-tab-content').forEach(el => {
    el.classList.remove('active');
  });
  
  const tabMatchedBtn = document.getElementById('btnTabMatched');
  const tabMissingBtn = document.getElementById('btnTabMissing');
  const tabExtraBtn = document.getElementById('btnTabExtra');

  if (tabMatchedBtn && tabMissingBtn && tabExtraBtn) {
    tabMatchedBtn.classList.remove('active');
    tabMissingBtn.classList.remove('active');
    tabExtraBtn.classList.remove('active');
  }

  if (tab === 'matched') {
    document.getElementById('auditTabMatched').classList.add('active');
    if (tabMatchedBtn) tabMatchedBtn.classList.add('active');
  } else if (tab === 'missing') {
    document.getElementById('auditTabMissing').classList.add('active');
    if (tabMissingBtn) tabMissingBtn.classList.add('active');
  } else if (tab === 'extra') {
    document.getElementById('auditTabExtra').classList.add('active');
    if (tabExtraBtn) tabExtraBtn.classList.add('active');
  }
}

// Audit button inside Compose modal next JID input
function triggerAuditFromInput() {
  const jid = document.getElementById('broadcastGroupJid').value.trim();
  if (!jid) {
    showToast('Please enter a Group JID to audit first.', 'warning');
    return;
  }
  openAuditModal(jid);
}

// Open Reschedule Modal
function openRescheduleModal(jobId, currentScheduledAt) {
  const modal = document.getElementById('rescheduleModal');
  if (!modal) return;

  document.getElementById('rescheduleJobId').value = jobId;
  
  const timeInput = document.getElementById('rescheduleTimeInputVal');
  if (timeInput) {
    if (currentScheduledAt) {
      const date = new Date(currentScheduledAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      timeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 5);
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      timeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  }

  modal.classList.add('show');
  document.body.classList.add('modal-open');
}

// Close Reschedule Modal
function closeRescheduleModal() {
  const modal = document.getElementById('rescheduleModal');
  if (!modal) return;

  modal.classList.remove('show');
  if (!document.getElementById('composerModal').classList.contains('show') && 
      !document.getElementById('auditModal').classList.contains('show')) {
    document.body.classList.remove('modal-open');
  }
}

function handleRescheduleBackdropClick(event) {
  if (event.target.id === 'rescheduleModal') {
    closeRescheduleModal();
  }
}

// Submit new schedule date & time to backend
async function submitReschedule(event) {
  event.preventDefault();

  const jobId = document.getElementById('rescheduleJobId').value;
  const scheduledAt = document.getElementById('rescheduleTimeInputVal').value;

  if (!jobId || !scheduledAt) {
    showToast('Job ID and reschedule date/time are required.', 'warning');
    return;
  }

  const submitBtn = document.getElementById('rescheduleSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Updating...';

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/whatsapp/jobs/${jobId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to reschedule');

    showToast('Broadcast rescheduled successfully!', 'success');
    closeRescheduleModal();
    loadMessageHistory(true); // reload table
  } catch (err) {
    console.error('Failed to reschedule:', err);
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Update Schedule Time';
  }
}

// Cancel a scheduled message
async function cancelScheduledMessage(jobId) {
  if (!confirm('Are you sure you want to cancel and delete this scheduled broadcast?')) return;

  try {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${CONFIG.basePath}/whatsapp/jobs/${jobId}/cancel`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to cancel');

    showToast('Scheduled broadcast cancelled and removed.', 'info');
    loadMessageHistory(true); // reload table
  } catch (err) {
    console.error('Failed to cancel broadcast:', err);
    showToast(`Error: ${err.message}`, 'error');
  }
}
