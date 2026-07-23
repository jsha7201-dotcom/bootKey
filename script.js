// ─── KEY SYSTEM ──────────────────────────────────────────────────────
class KeySystem {
    constructor() {
        this.keys = this.loadKeys();
        this.validKeys = new Map();
        this.validateAllKeys();
    }

    loadKeys() {
        try {
            const data = localStorage.getItem('ashot_keys_admin');
            return data ? JSON.parse(data) : {};
        } catch(e) {
            return {};
        }
    }

    saveKeys() {
        localStorage.setItem('ashot_keys_admin', JSON.stringify(this.keys));
        this.validateAllKeys();
    }

    validateAllKeys() {
        this.validKeys.clear();
        const now = Math.floor(Date.now() / 1000);
        for (const [key, data] of Object.entries(this.keys)) {
            if (data.expiry > now) {
                this.validKeys.set(key, data);
            }
        }
    }

    generateKey(username, hours) {
        const key = this.generateKeyString(username);
        const expiry = Math.floor(Date.now() / 1000) + (hours * 3600);
        this.keys[key] = {
            username: username,
            expiry: expiry,
            created: Math.floor(Date.now() / 1000),
            duration: hours
        };
        this.saveKeys();
        this.validateAllKeys();
        return key;
    }

    generateKeyString(username) {
        const random = Math.random().toString(36).substring(2, 10);
        const timestamp = Date.now().toString(36);
        const hash = this.simpleHash(username + random + timestamp);
        return `${username.substring(0, 4)}${hash.substring(0, 8)}`.toUpperCase();
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    validateKey(key) {
        this.validateAllKeys();
        if (this.validKeys.has(key)) {
            return {
                valid: true,
                data: this.validKeys.get(key)
            };
        }
        return {
            valid: false,
            message: 'Key invalid or expired'
        };
    }

    deleteKey(key) {
        delete this.keys[key];
        this.saveKeys();
        this.validateAllKeys();
    }

    listKeys() {
        this.validateAllKeys();
        return Object.fromEntries(this.validKeys);
    }

    getAllKeys() {
        return this.keys;
    }

    exportKeys() {
        return JSON.stringify(this.keys, null, 2);
    }

    importKeys(json) {
        try {
            const data = JSON.parse(json);
            this.keys = data;
            this.saveKeys();
            this.validateAllKeys();
            return true;
        } catch(e) {
            return false;
        }
    }
}

// ─── INSTANCE ────────────────────────────────────────────────────────
const keySystem = new KeySystem();

// ─── UI FUNCTIONS ────────────────────────────────────────────────────

function generateKey() {
    const username = document.getElementById('gen-username').value.trim() || 'user';
    const hours = parseInt(document.getElementById('gen-hours').value) || 24;
    
    const key = keySystem.generateKey(username, hours);
    
    document.getElementById('gen-result').innerHTML = `
        <div class="key-display">${key}</div>
        <div class="key-info">
            👤 Username: ${username}<br>
            ⏱ Valid for: ${hours} hours<br>
            📅 Expires: ${new Date((Math.floor(Date.now() / 1000) + hours * 3600) * 1000).toLocaleString()}
        </div>
        <div style="margin-top:12px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <button onclick="copyKey('${key}')" class="btn btn-secondary" style="padding:8px 16px;font-size:12px;">📋 Copy Key</button>
            <button onclick="downloadKeysFile()" class="btn btn-secondary" style="padding:8px 16px;font-size:12px;">📥 Download keys.json</button>
        </div>
        <div style="margin-top:12px;padding:10px;background:rgba(255,200,77,0.1);border-radius:8px;border:1px solid rgba(255,200,77,0.2);">
            <span style="color:#ffc84d;font-size:12px;">⚠️ Don't forget to upload <code>keys.json</code> to GitHub!</span>
        </div>
    `;
}

function copyKey(key) {
    navigator.clipboard.writeText(key).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = originalText, 2000);
    });
}

function validateKey() {
    const key = document.getElementById('val-key').value.trim().toUpperCase();
    if (!key) {
        document.getElementById('val-result').innerHTML = '<span class="invalid">Please enter a key</span>';
        return;
    }

    const result = keySystem.validateKey(key);
    if (result.valid) {
        document.getElementById('val-result').innerHTML = `
            <div style="color: #4dff88; font-size: 18px; font-weight: 600;">✅ Valid Key</div>
            <div style="color: rgba(255,255,255,0.6); margin-top: 8px;">
                👤 Username: ${result.data.username}<br>
                📅 Expires: ${new Date(result.data.expiry * 1000).toLocaleString()}
            </div>
        `;
    } else {
        document.getElementById('val-result').innerHTML = `
            <div style="color: #ff4d4d; font-size: 16px; font-weight: 600;">❌ ${result.message}</div>
        `;
    }
}

function listKeys() {
    const keys = keySystem.listKeys();
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
            <td>
                <button onclick="copyKeyFromList('${key}')" class="btn btn-secondary" style="padding: 4px 12px; font-size: 11px;">📋</button>
                <button onclick="deleteKey('${key}')" class="btn btn-danger" style="padding: 4px 12px; font-size: 11px;">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

function copyKeyFromList(key) {
    navigator.clipboard.writeText(key);
}

function deleteKey(key) {
    if (confirm(`Delete key ${key}?`)) {
        keySystem.deleteKey(key);
        listKeys();
    }
}

function downloadKeysFile() {
    const json = keySystem.exportKeys();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keys.json';
    a.click();
    URL.revokeObjectURL(url);
}

function uploadKeys(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const success = keySystem.importKeys(e.target.result);
        if (success) {
            alert('✅ Keys imported successfully!');
            listKeys();
        } else {
            alert('❌ Invalid JSON file');
        }
    };
    reader.readAsText(file);
}

// ─── EXPOSE TO GLOBAL ──────────────────────────────────────────────
window.generateKey = generateKey;
window.copyKey = copyKey;
window.validateKey = validateKey;
window.listKeys = listKeys;
window.deleteKey = deleteKey;
window.downloadKeysFile = downloadKeysFile;
window.uploadKeys = uploadKeys;
window.copyKeyFromList = copyKeyFromList;

// ─── LOAD ON PAGE ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    listKeys();
    console.log('🔑 Ashot Key System loaded!');
    console.log('📋 Active keys:', keySystem.listKeys());
});
