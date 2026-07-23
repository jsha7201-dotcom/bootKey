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
        // Télécharger aussi pour export
        this.downloadKeysFile();
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

    downloadKeysFile() {
        const json = JSON.stringify(this.keys, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'keys.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    uploadKeysFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.keys = data;
                    this.saveKeys();
                    this.validateAllKeys();
                    resolve(true);
                } catch(e) {
                    reject(e);
                }
            };
            reader.readAsText(file);
        });
    }
}

// ─── INSTANCE ────────────────────────────────────────────────────────
const keySystem = new KeySystem();

// ─── UI FUNCTIONS ────────────────────────────────────────────────────

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.querySelector(`.admin-tab[onclick="showTab('${tab}')"]`).classList.add('active');
}

function generateKey() {
    const username = document.getElementById('gen-username').value.trim() || 'user';
    const hours = parseInt(document.getElementById('gen-hours').value) || 24;
    const customKey = document.getElementById('gen-custom-key').value.trim().toUpperCase();

    let key;
    if (customKey) {
        key = customKey;
        const expiry = Math.floor(Date.now() / 1000) + (hours * 3600);
        keySystem.keys[key] = {
            username: username,
            expiry: expiry,
            created: Math.floor(Date.now() / 1000),
            duration: hours
        };
        keySystem.saveKeys();
        keySystem.validateAllKeys();
    } else {
        key = keySystem.generateKey(username, hours);
    }

    document.getElementById('gen-result').innerHTML = `
        <div class="key-display">${key}</div>
        <div class="key-info">
            Username: ${username}<br>
            Valid for: ${hours} hours<br>
            Expires: ${new Date((Math.floor(Date.now() / 1000) + hours * 3600) * 1000).toLocaleString()}
        </div>
        <button onclick="copyKey('${key}')" class="btn btn-secondary" style="margin-top:10px;">📋 Copy Key</button>
        <button onclick="downloadKey('${key}')" class="btn btn-secondary" style="margin-top:10px;">📥 Download keys.json</button>
    `;
}

function copyKey(key) {
    navigator.clipboard.writeText(key).then(() => {
        alert('✅ Key copied to clipboard!');
    });
}

function downloadKey() {
    keySystem.downloadKeysFile();
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
                <button onclick="copyKey('${key}')" class="btn btn-secondary" style="padding: 4px 12px; font-size: 11px;">📋 Copy</button>
                <button onclick="deleteKey('${key}')" class="btn btn-danger" style="padding: 4px 12px; font-size: 11px;">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

function deleteKey(key) {
    if (confirm(`Delete key ${key}?`)) {
        keySystem.deleteKey(key);
        listKeys();
    }
}

function downloadKeys() {
    keySystem.downloadKeysFile();
}

async function uploadKeys(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        await keySystem.uploadKeysFile(file);
        document.getElementById('github-status').innerHTML = `
            <div style="color: #4dff88;">✅ Keys uploaded successfully!</div>
            <div style="color: rgba(255,255,255,0.5); margin-top:8px;">
                ${Object.keys(keySystem.keys).length} keys loaded
            </div>
        `;
        listKeys();
    } catch(e) {
        document.getElementById('github-status').innerHTML = `
            <div style="color: #ff4444;">❌ Error uploading file: ${e.message}</div>
        `;
    }
}

// ─── EXPOSE TO GLOBAL ──────────────────────────────────────────────
window.showTab = showTab;
window.generateKey = generateKey;
window.copyKey = copyKey;
window.downloadKey = downloadKey;
window.validateKey = validateKey;
window.listKeys = listKeys;
window.deleteKey = deleteKey;
window.downloadKeys = downloadKeys;
window.uploadKeys = uploadKeys;
window.KeySystem = KeySystem;
