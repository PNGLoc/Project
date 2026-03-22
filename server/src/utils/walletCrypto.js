import crypto from 'crypto';

let cachedKeyPair = null;
let warnedFallbackKey = false;

const NONCE_TTL_MS = 5 * 60 * 1000;
const nonceStore = new Map();

const decodeBase64 = (value) => Buffer.from(String(value || ''), 'base64');

const cleanupExpiredNonces = () => {
    const now = Date.now();
    for (const [key, expiresAt] of nonceStore.entries()) {
        if (expiresAt <= now) {
            nonceStore.delete(key);
        }
    }
};

setInterval(cleanupExpiredNonces, 60 * 1000).unref();

const getWalletKeyPair = () => {
    if (cachedKeyPair) {
        return cachedKeyPair;
    }

    const privatePem = process.env.WALLET_RSA_PRIVATE_KEY;
    const publicPem = process.env.WALLET_RSA_PUBLIC_KEY;

    if (privatePem && publicPem) {
        cachedKeyPair = { privateKey: privatePem, publicKey: publicPem };
        return cachedKeyPair;
    }

    const generated = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    if (!warnedFallbackKey) {
        warnedFallbackKey = true;
        console.warn('[WALLET CRYPTO] WALLET_RSA_PRIVATE_KEY/PUBLIC_KEY not configured. Using runtime-generated keys.');
    }

    cachedKeyPair = generated;
    return cachedKeyPair;
};

export const getWalletEncryptionPublicKey = () => {
    return getWalletKeyPair().publicKey;
};

export const decryptWalletEnvelope = ({ encryptedKey, iv, payload, userId }) => {
    if (!encryptedKey || !iv || !payload) {
        throw new Error('Missing encrypted payload fields.');
    }

    const { privateKey } = getWalletKeyPair();
    const aesKey = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        },
        decodeBase64(encryptedKey)
    );

    const ivBuffer = decodeBase64(iv);
    const encryptedPayload = decodeBase64(payload);
    if (encryptedPayload.length <= 16) {
        throw new Error('Encrypted payload is invalid.');
    }

    const authTag = encryptedPayload.subarray(encryptedPayload.length - 16);
    const encryptedData = encryptedPayload.subarray(0, encryptedPayload.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, ivBuffer);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
    ]).toString('utf8');

    const parsed = JSON.parse(plaintext);
    const nonce = String(parsed?.nonce || '').trim();
    const timestamp = Number(parsed?.timestamp || 0);

    if (!nonce || !Number.isFinite(timestamp)) {
        throw new Error('Missing wallet request nonce or timestamp.');
    }

    const now = Date.now();
    if (Math.abs(now - timestamp) > NONCE_TTL_MS) {
        throw new Error('Wallet request timestamp is out of allowed window.');
    }

    const nonceKey = `${String(userId || '')}:${nonce}`;
    if (nonceStore.has(nonceKey)) {
        throw new Error('Duplicate wallet request detected.');
    }

    nonceStore.set(nonceKey, now + NONCE_TTL_MS);
    return parsed;
};
