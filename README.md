# 🔑 Ashot Keys - License Management System

A simple key generation system for Ashot bots.

## 🚀 Quick Start

1. Visit: `https://your-username.github.io/ashot-keys/`
2. Go to Admin panel (password: `ashot2024`)
3. Generate keys for users

## 📝 Features

- ✅ Generate unique license keys
- ✅ Validate keys with expiry
- ✅ Admin dashboard
- ✅ Bulk key generation
- ✅ Export/Import JSON
- ✅ Copy to clipboard

## 🔧 API Endpoints

The key system can be integrated with any backend:

```javascript
// Generate key
const key = KeySystem.generateKey('username', 24);

// Validate key
const result = KeySystem.validateKey('KEY123456');

// List all active keys
const keys = KeySystem.listActiveKeys();
