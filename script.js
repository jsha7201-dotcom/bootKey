// Key System Logic
const KeySystem = {
    // Storage key
    STORAGE_KEY: 'ashot_keys_data',
    
    // Admin password (change this!)
    ADMIN_PASSWORD: 'ashot2024',
    
    // Get all keys from storage
    getKeys() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch(e) {
            return {};
        }
    },
    
    // Save keys to storage
    saveKeys(keys) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
    },
    
    // Generate a new key
    generateKey(username, hours) {
        const keys = this.getKeys();
        const key = this.generateKeyString(username);
        const now = Math.floor(Date.now() / 1000);
        const expiry = now + (hours * 3600);
        
        keys[key] = {
            username: username,
            expiry: expiry,
            created: now,
            duration: hours
        };
        
        this.saveKeys(keys);
        return key;
    },
    
    // Generate key string
    generateKeyString(username) {
        const random = Math.random().toString(36).substring(2, 10);
        const timestamp = Date.now().toString(36);
        const hash = this.simpleHash(username + random + timestamp);
        return `${username.substring(0, 4)}${hash.substring(0, 8)}`.toUpperCase();
    },
    
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },
    
    // Validate a key
    validateKey(key) {
        const keys = this.getKeys();
        const now = Math.floor(Date.now() / 1000);
        
        if (!keys[key]) {
            return { valid: false, message: 'Key not found' };
        }
        
        if (keys[key].expiry < now) {
            return { valid: false, message: 'Key expired' };
        }
        
        return { 
            valid: true, 
            data: keys[key],
            message: `Valid for ${keys[key].username}`
        };
    },
    
    // List all active keys
    listActiveKeys() {
        const keys = this.getKeys();
        const now = Math.floor(Date.now() / 1000);
        const active = {};
        
        for (const [key, data] of Object.entries(keys)) {
            if (data.expiry > now) {
                active[key] = data;
            }
        }
        
        return active;
    },
    
    // List all keys (including expired)
    listAllKeys() {
        return this.getKeys();
    },
    
    // Delete a key
    deleteKey(key) {
        const keys = this.getKeys();
        delete keys[key];
        this.saveKeys(keys);
    },
    
    // Clear all keys
    clearAllKeys() {
        this.saveKeys({});
    },
    
    // Export keys as JSON
    exportKeys() {
        return JSON.stringify(this.getKeys(), null, 2);
    },
    
    // Import keys from JSON
    importKeys(json) {
        try {
            const data = JSON.parse(json);
            this.saveKeys(data);
            return true;
        } catch(e) {
            return false;
        }
    }
};

// ─── UI FUNCTIONS ───────────────────────────────────────────────────────

// Generate key
function generateKey() {
    const username = document.getElementById('gen-username').value.trim();
    const hours = parseInt(document.getElementById('gen-hours').value);
    
    if (!username) {
        document.getElementById('gen-result').innerHTML = '<span class="invalid">Please enter a username</span>';
        return;
    }
    
    if (hours < 1 || hours > 8760) {
        document.getElementById('gen-result').innerHTML = '<span class="invalid">Hours must be between 1 and 8760</span>';
        return;
    }
    
    const key = KeySystem.generateKey(username, hours);
    
    document.getElementById('gen-result').innerHTML = `
        <div class="key-display">${key}</div>
        <div class="key-info">
            Username: ${username}<br>
            Valid for: ${hours} hours
        </div>
    `;
    
    // Auto-copy to clipboard
    navigator.clipboard.writeText(key).then(() => {
        // Optional: show copied notification
    });
}

// Validate key
function validateKey() {
    const key = document.getElementById('val-key').value.trim().toUpperCase();
    
    if (!key) {
        document.getElementById('val-result').innerHTML = '<span class="invalid">Please enter a key</span>';
        return;
    }
    
    const result = KeySystem.validateKey(key);
    
    if (result.valid) {
        document.getElementById('val-result').innerHTML = `
            <div style="color: #4dff88; font-size: 18px; font-weight: 600;">✅ Valid Key</div>
            <div style="color: rgba(255,255,255,0.6); margin-top: 8px;">
                Username: ${result.data.username}<br>
                Expires: ${new Date(result.data.expiry * 1000).toLocaleString()}
            </div>
        `;
    } else {
        document.getElementById('val-result').innerHTML = `
            <div style="color: #ff4d4d; font-size: 16px; font-weight: 600;">❌ ${result.message}</div>
        `;
    }
}

// List keys
function listKeys() {
    const keys = KeySystem.listActiveKeys();
    const tbody = document.getElementById('keys-body');
    tbody.innerHTML = '';
    
    if (Object.keys(keys).length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: rgba(255,255,255,0.3);">No active keys</td></tr>';
        return;
    }
    
    for (const [key, data] of Object.entries(keys)) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="font-family: monospace; font-weight: 600; color: #4dff88;">${key}</span></td>
            <td>${data.username}</td>
            <td>${new Date(data.expiry * 1000).toLocaleString()}</td>
            <td><button onclick="copyKey('${key}')" class="btn btn-secondary" style="padding: 4px 12px; font-size: 11px;">📋 Copy</button></td>
        `;
        tbody.appendChild(tr);
    }
}

// Copy key to clipboard
function copyKey(key) {
    navigator.clipboard.writeText(key).then(() => {
        // Show temporary feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// ─── ADMIN FUNCTIONS ───────────────────────────────────────────────────

function adminLogin() {
    const pass = document.getElementById('admin-pass').value;
    
    if (pass === KeySystem.ADMIN_PASSWORD) {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        refreshAdminStats();
        refreshAdminList();
    } else {
        document.getElementById('login-error').textContent = 'Incorrect password';
    }
}

function refreshAdminStats() {
    const keys = KeySystem.listAllKeys();
    const now = Math.floor(Date.now() / 1000);
    
    let total = 0;
    let active = 0;
    let expired = 0;
    
    for (const [key, data] of Object.entries(keys)) {
        total++;
        if (data.expiry > now) active++;
        else expired++;
    }
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-expired').textContent = expired;
}

function refreshAdminList() {
    const keys = KeySystem.listAllKeys();
    const now = Math.floor(Date.now() / 1000);
    const tbody = document.getElementById('admin-keys-body');
    tbody.innerHTML = '';
    
    if (Object.keys(keys).length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: rgba(255,255,255,0.3);">No keys</td></tr>';
        return;
    }
    
    for (const [key, data] of Object.entries(keys)) {
        const isActive = data.expiry > now;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="font-family: monospace;">${key}</span></td>
            <td>${data.username}</td>
            <td>${new Date(data.created * 1000).toLocaleString()}</td>
            <td>${new Date(data.expiry * 1000).toLocaleString()}</td>
            <td><span class="status-badge ${isActive ? 'status-active' : 'status-expired'}">${isActive ? '✅ Active' : '❌ Expired'}</span></td>
            <td><button onclick="deleteKey('${key}')" class="btn btn-danger" style="padding: 4px 12px; font-size: 11px;">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    }
}

function deleteKey(key) {
    if (confirm(`Delete key ${key}?`)) {
        KeySystem.deleteKey(key);
        refreshAdminStats();
        refreshAdminList();
    }
}

function bulkGenerate() {
    const prefix = document.getElementById('bulk-prefix').value.trim() || 'user';
    const count = parseInt(document.getElementById('bulk-count').value) || 5;
    const hours = parseInt(document.getElementById('bulk-hours').value) || 24;
    
    if (count > 100) {
        alert('Maximum 100 keys at a time');
        return;
    }
    
    for (let i = 0; i < count; i++) {
        const username = `${prefix}${i + 1}`;
        KeySystem.generateKey(username, hours);
    }
    
    refreshAdminStats();
    refreshAdminList();
    alert(`Generated ${count} keys successfully!`);
}

function exportKeys() {
    const json = KeySystem.exportKeys();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keys_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importKeys() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            const success = KeySystem.importKeys(event.target.result);
            if (success) {
                refreshAdminStats();
                refreshAdminList();
                alert('Keys imported successfully!');
            } else {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllKeys() {
    if (confirm('⚠️ Delete ALL keys? This cannot be undone!')) {
        KeySystem.clearAllKeys();
        refreshAdminStats();
        refreshAdminList();
        alert('All keys cleared');
    }
}

// ─── TAB SYSTEM ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and contents
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding content
            const tabId = this.dataset.tab;
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
});

// ─── EXPOSE TO GLOBAL ──────────────────────────────────────────────

window.generateKey = generateKey;
window.validateKey = validateKey;
window.listKeys = listKeys;
window.copyKey = copyKey;
window.adminLogin = adminLogin;
window.deleteKey = deleteKey;
window.bulkGenerate = bulkGenerate;
window.exportKeys = exportKeys;
window.importKeys = importKeys;
window.clearAllKeys = clearAllKeys;
window.KeySystem = KeySystem;
