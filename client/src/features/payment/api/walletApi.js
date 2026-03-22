import axiosClient from '../../../lib/axios';

const toBase64 = (arrayBuffer) => {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

const pemToArrayBuffer = (pem) => {
    const cleaned = String(pem || '')
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s+/g, '');

    const binary = window.atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

const buildEncryptedPayload = async ({ amount, publicKeyPem }) => {
    const rsaPublicKey = await window.crypto.subtle.importKey(
        'spki',
        pemToArrayBuffer(publicKeyPem),
        {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        },
        false,
        ['encrypt']
    );

    const aesKey = await window.crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256
        },
        true,
        ['encrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const nonceBytes = window.crypto.getRandomValues(new Uint8Array(16));
    const nonce = Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

    const body = {
        amount,
        nonce,
        timestamp: Date.now()
    };

    const plaintext = new TextEncoder().encode(JSON.stringify(body));
    const encryptedPayload = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv
        },
        aesKey,
        plaintext
    );

    const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const encryptedKey = await window.crypto.subtle.encrypt(
        {
            name: 'RSA-OAEP'
        },
        rsaPublicKey,
        rawAesKey
    );

    return {
        encryptedKey: toBase64(encryptedKey),
        iv: toBase64(iv.buffer),
        payload: toBase64(encryptedPayload)
    };
};

const walletApi = {
    getBalance: async () => {
        const response = await axiosClient.get('/api/payments/wallet/balance');
        return response.data;
    },
    getPublicKey: async () => {
        const response = await axiosClient.get('/api/payments/wallet/public-key');
        return response.data;
    },
    addFundEncrypted: async (amount) => {
        const keyRes = await walletApi.getPublicKey();
        const publicKey = keyRes?.data?.publicKey;
        if (!publicKey) {
            throw new Error('Wallet encryption key unavailable.');
        }

        const encrypted = await buildEncryptedPayload({ amount, publicKeyPem: publicKey });
        const response = await axiosClient.post('/api/payments/wallet/add-fund', encrypted);
        return response.data;
    }
};

export default walletApi;
