const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes) => {
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
};

const base64ToBytes = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const deriveKey = async (passphrase, saltBase64) => {
    const salt = base64ToBytes(saltBase64);
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 210000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
};

export const createSalt = () => bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));

export const encryptText = async (plainText, passphrase) => {
    const salt = createSalt();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoder.encode(plainText)
    );
    return {
        cipherText: bytesToBase64(new Uint8Array(encrypted)),
        iv: bytesToBase64(iv),
        salt,
        algorithm: "AES-GCM/PBKDF2-SHA-256",
    };
};

export const decryptText = async ({ cipherText, iv, salt }, passphrase) => {
    const key = await deriveKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToBytes(iv) },
        key,
        base64ToBytes(cipherText)
    );
    return decoder.decode(decrypted);
};

export const encryptFile = async (file, passphrase) => {
    const salt = createSalt();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        await file.arrayBuffer()
    );
    return {
        blob: new Blob([encrypted], { type: "application/octet-stream" }),
        iv: bytesToBase64(iv),
        salt,
        mimeType: file.type || "application/octet-stream",
        originalName: file.name,
        size: file.size,
    };
};

export const decryptAttachmentBlob = async (attachment, passphrase) => {
    const response = await fetch(attachment.downloadUrl);
    if (!response.ok) {
        throw new Error("Attachment download failed");
    }
    const encrypted = await response.arrayBuffer();
    const key = await deriveKey(passphrase, attachment.salt);
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToBytes(attachment.iv) },
        key,
        encrypted
    );
    return new Blob([decrypted], { type: attachment.mimeType || "application/octet-stream" });
};
