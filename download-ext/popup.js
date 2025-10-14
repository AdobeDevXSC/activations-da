// popup.js
const logs = [];
let verbose = false;

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString();
}

function addLog(entry) {
  logs.push(entry);
  renderLogs();
}

function renderLogs() {
  const logsDiv = document.getElementById('logs');
  const filtered = verbose ? logs : logs.filter(log => !log.verbose);
  
  logsDiv.innerHTML = filtered.map(log => `
    <div class="row ${log.level || ''}">
      <span class="time">${formatTime(log.timestamp)}</span>
      <span class="msg">${escapeHtml(log.message)}</span>
    </div>
  `).join('');
  
  // Auto-scroll to bottom
  logsDiv.scrollTop = logsDiv.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function clearLogs() {
  logs.length = 0;
  chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' });
  renderLogs();
  updateStatus();
}

function copyLogs() {
  const text = logs.map(log => `${formatTime(log.timestamp)} ${log.message}`).join('\n');
  navigator.clipboard.writeText(text);
}

function updateStatus() {
  document.getElementById('status').textContent = `${logs.length} entries`;
}

function refreshLogs() {
  chrome.runtime.sendMessage({ type: 'GET_LOGS' }, (response) => {
    if (response && response.logs) {
      logs.length = 0;
      logs.push(...response.logs);
      renderLogs();
      updateStatus();
    }
  });
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refresh');
  const clearBtn = document.getElementById('clear');
  const copyBtn = document.getElementById('copy');
  const verboseCheckbox = document.getElementById('verbose');

  refreshBtn.addEventListener('click', refreshLogs);
  clearBtn.addEventListener('click', clearLogs);
  copyBtn.addEventListener('click', copyLogs);
  
  verboseCheckbox.addEventListener('change', (e) => {
    verbose = e.target.checked;
    renderLogs();
  });

  // Load initial logs
  refreshLogs();
  
  // Listen for new log messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NEW_LOG') {
      addLog(message.log);
      updateStatus();
    }
  });
});
