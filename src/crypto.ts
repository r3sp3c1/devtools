// @ts-nocheck
import crypto from "crypto";
import sodium from "libsodium-wrappers-sumo";
import fs from "fs";
import * as kyber from "crystals-kyber";
import { getCustomKeys, CustomKey } from "./keychain";

// Helper to derive a 32-byte key from a password using chosen KDF
async function deriveKey(password: string, salt: Buffer, kdfMethod: string): Promise<Buffer> {
    if (kdfMethod === "pbkdf2") {
        return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
    } else {
        // Argon2 via libsodium sumo
        await sodium.ready;
        const key = sodium.crypto_pwhash(
            32, // keybytes
            password,
            salt,
            sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
            sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
            sodium.crypto_pwhash_ALG_ARGON2ID13
        );
        return Buffer.from(key);
    }
}

// AES-256-GCM
export async function encryptAes(text: string, password?: string, keyObj?: CustomKey, kdfMethod = "pbkdf2", keyPassword?: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const secret = keyObj ? Buffer.from(await unlockKey(keyObj, keyPassword), "base64") : await deriveKey(password!, salt, kdfMethod);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret, iv);
  
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return Buffer.from(JSON.stringify({
    s: keyObj ? undefined : salt.toString("base64"),
    k: kdfMethod,
    i: iv.toString("base64"),
    t: authTag.toString("base64"),
    d: encrypted
  })).toString("base64");
}

export async function decryptAes(encryptedBase64: string, password?: string, keyObj?: CustomKey, keyPassword?: string): Promise<string> {
  const payload = JSON.parse(Buffer.from(encryptedBase64, "base64").toString("utf8"));
  const iv = Buffer.from(payload.i, "base64");
  const authTag = Buffer.from(payload.t, "base64");
  const encrypted = payload.d;
  const kdfMethod = payload.k || "pbkdf2";

  const secret = keyObj ? Buffer.from(await unlockKey(keyObj, keyPassword), "base64") : await deriveKey(password!, Buffer.from(payload.s, "base64"), kdfMethod);
  const decipher = crypto.createDecipheriv("aes-256-gcm", secret, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function encryptAesFile(filePath: string, password?: string, keyObj?: CustomKey, kdfMethod = "pbkdf2", keyPassword?: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const secret = keyObj ? Buffer.from(await unlockKey(keyObj, keyPassword), "base64") : await deriveKey(password!, salt, kdfMethod);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", secret, iv);
    
    const outPath = filePath + ".aes";
    const outFd = fs.openSync(outPath, "w");
    
    const sStr = keyObj ? undefined : salt.toString("base64");
    fs.writeSync(outFd, `{"s":${JSON.stringify(sStr)},"k":${JSON.stringify(kdfMethod)},"i":${JSON.stringify(iv.toString("base64"))},"d":"`);
    
    const readStream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
    let remainder = Buffer.alloc(0);
    
    try {
        await new Promise((resolve, reject) => {
            readStream.on("data", (chunk: Buffer) => {
                try {
                    const encrypted = cipher.update(chunk);
                    const combined = Buffer.concat([remainder, encrypted]);
                    const outputLen = combined.length - (combined.length % 3);
                    if (outputLen > 0) {
                        fs.writeSync(outFd, combined.subarray(0, outputLen).toString("base64"));
                        remainder = combined.subarray(outputLen);
                    } else {
                        remainder = combined;
                    }
                } catch(e) { reject(e); }
            });
            readStream.on("end", () => {
                try {
                    const finalEnc = cipher.final();
                    const combined = Buffer.concat([remainder, finalEnc]);
                    if (combined.length > 0) {
                        fs.writeSync(outFd, combined.toString("base64"));
                    }
                    resolve(null);
                } catch(e) { reject(e); }
            });
            readStream.on("error", reject);
        });
        
        const authTag = cipher.getAuthTag();
        fs.writeSync(outFd, `","t":${JSON.stringify(authTag.toString("base64"))}}`);
    } catch (err) {
        fs.closeSync(outFd);
        try { fs.unlinkSync(outPath); } catch (e) {}
        throw err;
    }
    fs.closeSync(outFd);
    return outPath;
}

export async function decryptAesFile(filePath: string, password?: string, keyObj?: CustomKey, keyPassword?: string): Promise<string> {
    const fd = fs.openSync(filePath, "r");
    const stat = fs.fstatSync(fd);
    const fileSize = stat.size;

    const headSize = Math.min(fileSize, 8192);
    const headBuf = Buffer.alloc(headSize);
    fs.readSync(fd, headBuf, 0, headSize, 0);
    const headStr = headBuf.toString("utf8");

    const dMatch = headStr.match(/"d"\s*:\s*"/);
    if (!dMatch) {
        fs.closeSync(fd);
        throw new Error("Invalid encrypted file format (missing 'd' field)");
    }
    const dStartFileOffset = dMatch.index! + dMatch[0].length;

    const tailSize = Math.min(fileSize, 8192);
    const tailStart = Math.max(0, fileSize - tailSize);
    const tailBuf = Buffer.alloc(tailSize);
    fs.readSync(fd, tailBuf, 0, tailSize, tailStart);
    const tailStr = tailBuf.toString("utf8");

    let dEndFileOffset = -1;
    if (fileSize <= 8192) {
        dEndFileOffset = headStr.indexOf('"', dStartFileOffset);
    } else {
        const quoteIdx = tailStr.indexOf('"');
        if (quoteIdx !== -1) {
            dEndFileOffset = tailStart + quoteIdx;
        }
    }

    if (dEndFileOffset === -1) {
        fs.closeSync(fd);
        throw new Error("Invalid encrypted file format (missing closing quote for 'd' field)");
    }

    const part1 = headStr.slice(0, dStartFileOffset);
    const part2 = tailStr.slice(dEndFileOffset - tailStart);
    const payload = JSON.parse(part1 + part2);

    fs.closeSync(fd);

    const iv = Buffer.from(payload.i, "base64");
    const authTag = Buffer.from(payload.t, "base64");
    const kdfMethod = payload.k || "pbkdf2";
    const secret = keyObj ? Buffer.from(await unlockKey(keyObj, keyPassword), "base64") : await deriveKey(password!, Buffer.from(payload.s, "base64"), kdfMethod);
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", secret, iv);
    decipher.setAuthTag(authTag);
    
    const outPath = filePath.replace(/\.aes$/, "");
    const outFd = fs.openSync(outPath, "w");
    
    const readStream = fs.createReadStream(filePath, { start: dStartFileOffset, end: dEndFileOffset - 1, encoding: "utf8", highWaterMark: 64 * 1024 });
    
    let remainder = "";
    try {
        await new Promise((resolve, reject) => {
            readStream.on("data", (chunk: string) => {
                try {
                    const combined = remainder + chunk;
                    const validLen = combined.length - (combined.length % 4);
                    if (validLen > 0) {
                        const toProcess = combined.slice(0, validLen);
                        remainder = combined.slice(validLen);
                        const decrypted = decipher.update(toProcess, "base64");
                        fs.writeSync(outFd, decrypted);
                    } else {
                        remainder = combined;
                    }
                } catch(e) { reject(e); }
            });
            readStream.on("end", () => {
                try {
                    if (remainder.length > 0) {
                        const decrypted = decipher.update(remainder, "base64");
                        fs.writeSync(outFd, decrypted);
                    }
                    const finalDec = decipher.final();
                    fs.writeSync(outFd, finalDec);
                    resolve(null);
                } catch (e) { reject(e); }
            });
            readStream.on("error", reject);
        });
    } catch (err) {
        fs.closeSync(outFd);
        try { fs.unlinkSync(outPath); } catch(e){}
        throw err;
    }
    fs.closeSync(outFd);

    return outPath;
}

export async function encryptLibsodium(text: string, password?: string, keyObj?: CustomKey, kdfMethod = "pbkdf2", keyPassword?: string): Promise<string> {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  let key, salt;
  
  if (keyObj) {
      key = Buffer.from(await unlockKey(keyObj, keyPassword), "base64").slice(0, sodium.crypto_secretbox_KEYBYTES);
  } else {
      salt = crypto.randomBytes(16); // 16 bytes salt is standard for both PBKDF2 and Argon2
      key = await deriveKey(password!, salt, kdfMethod);
  }
  
  const cipherText = sodium.crypto_secretbox_easy(text, nonce, key);
  return Buffer.from(JSON.stringify({
    s: salt ? salt.toString("base64") : undefined,
    k: kdfMethod,
    n: Buffer.from(nonce).toString("base64"),
    c: Buffer.from(cipherText).toString("base64")
  })).toString("base64");
}

export async function decryptLibsodium(encryptedBase64: string, password?: string, keyObj?: CustomKey, keyPassword?: string): Promise<string> {
  await sodium.ready;
  const payload = JSON.parse(Buffer.from(encryptedBase64, "base64").toString("utf8"));
  const nonce = Buffer.from(payload.n, "base64");
  const cipherText = Buffer.from(payload.c, "base64");
  const kdfMethod = payload.k || "argon2";

  let key;
  if (keyObj) {
      key = Buffer.from(await unlockKey(keyObj, keyPassword), "base64").slice(0, sodium.crypto_secretbox_KEYBYTES);
  } else {
      const salt = Buffer.from(payload.s, "base64");
      key = await deriveKey(password!, salt, kdfMethod);
  }

  const decrypted = sodium.crypto_secretbox_open_easy(cipherText, nonce, key);
  return sodium.to_string(decrypted);
}

export async function encryptLibsodiumFile(filePath: string, password?: string, keyObj?: CustomKey, kdfMethod = "pbkdf2", keyPassword?: string): Promise<string> {
    await sodium.ready;
    const fileBuf = fs.readFileSync(filePath);
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    let key, salt;
    if (keyObj) {
        key = Buffer.from(await unlockKey(keyObj, keyPassword), "base64").slice(0, sodium.crypto_secretbox_KEYBYTES);
    } else {
        salt = crypto.randomBytes(16);
        key = await deriveKey(password!, salt, kdfMethod);
    }
    const cipherText = sodium.crypto_secretbox_easy(fileBuf, nonce, key);
    const payload = JSON.stringify({
        s: salt ? salt.toString("base64") : undefined,
        k: kdfMethod,
        n: Buffer.from(nonce).toString("base64"),
        c: Buffer.from(cipherText).toString("base64")
    });
    const outPath = filePath + ".sodium";
    fs.writeFileSync(outPath, payload, "utf8");
    return outPath;
}

export async function decryptLibsodiumFile(filePath: string, password?: string, keyObj?: CustomKey, keyPassword?: string): Promise<string> {
    await sodium.ready;
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const nonce = Buffer.from(payload.n, "base64");
    const cipherText = Buffer.from(payload.c, "base64");
    const kdfMethod = payload.k || "argon2";
    
    let key;
    if (keyObj) {
        key = Buffer.from(await unlockKey(keyObj, keyPassword), "base64").slice(0, sodium.crypto_secretbox_KEYBYTES);
    } else {
        const salt = Buffer.from(payload.s, "base64");
        key = await deriveKey(password!, salt, kdfMethod);
    }
    const decrypted = sodium.crypto_secretbox_open_easy(cipherText, nonce, key);
    const outPath = filePath.replace(/\.sodium$/, "");
    fs.writeFileSync(outPath, decrypted);
    return outPath;
}

export async function signLibsodium(text: string, keyObj: CustomKey, keyPassword?: string): Promise<string> {
    await sodium.ready;
    const privateKey = Buffer.from(await unlockKey(keyObj, keyPassword), "base64");
    const signed = sodium.crypto_sign(text, privateKey);
    return Buffer.from(signed).toString("base64");
}

export async function verifyLibsodium(signedBase64: string, keyObj: CustomKey): Promise<string> {
    await sodium.ready;
    const publicKey = Buffer.from(keyObj.publicKey!, "base64");
    const signed = Buffer.from(signedBase64, "base64");
    const opened = sodium.crypto_sign_open(signed, publicKey);
    return sodium.to_string(opened);
}



// Kyber PQC Hybrid Encryption (KEM -> AES-256-GCM)


// Kyber PQC Hybrid Encryption (KEM -> AES-256-GCM)

export async function encryptKyber(text: string, keyObj: CustomKey): Promise<string> {
    const pk = Buffer.from(keyObj.publicKey!, "base64");
    const level = keyObj.level || 768;
    let c, ss;
    if (level === 512) [c, ss] = kyber.Encrypt512(pk);
    else if (level === 1024) [c, ss] = kyber.Encrypt1024(pk);
    else [c, ss] = kyber.Encrypt768(pk);
    
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ss), iv);
    
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag();

    return Buffer.from(JSON.stringify({
        kem: Buffer.from(c).toString("base64"),
        l: level,
        i: iv.toString("base64"),
        t: authTag.toString("base64"),
        d: encrypted
    })).toString("base64");
}

export async function decryptKyber(text: string, keyObj: CustomKey, keyPassword?: string): Promise<string> {
    const payload = JSON.parse(Buffer.from(text, "base64").toString("utf8"));
    const sk = Buffer.from(await unlockKey(keyObj, keyPassword), "base64");
    const c = Buffer.from(payload.kem, "base64");
    const level = payload.l || keyObj.level || 768;
    
    let ss;
    if (level === 512) ss = kyber.Decrypt512(c, sk);
    else if (level === 1024) ss = kyber.Decrypt1024(c, sk);
    else ss = kyber.Decrypt768(c, sk);
    
    const iv = Buffer.from(payload.i, "base64");
    const authTag = Buffer.from(payload.t, "base64");
    const encrypted = payload.d;
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(ss), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

export async function encryptKyberFile(filePath: string, keyObj: CustomKey): Promise<string> {
    const pk = Buffer.from(keyObj.publicKey!, "base64");
    const level = keyObj.level || 768;
    let c, ss;
    if (level === 512) [c, ss] = kyber.Encrypt512(pk);
    else if (level === 1024) [c, ss] = kyber.Encrypt1024(pk);
    else [c, ss] = kyber.Encrypt768(pk);
    
    const fileBuf = fs.readFileSync(filePath);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ss), iv);
    
    const encrypted = Buffer.concat([cipher.update(fileBuf), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const payload = JSON.stringify({
        kem: Buffer.from(c).toString("base64"),
        l: level,
        i: iv.toString("base64"),
        t: authTag.toString("base64"),
        d: encrypted.toString("base64")
    });
    
    const outPath = filePath + ".kyber";
    fs.writeFileSync(outPath, payload, "utf8");
    return outPath;
}

export async function decryptKyberFile(filePath: string, keyObj: CustomKey, keyPassword?: string): Promise<string> {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const sk = Buffer.from(await unlockKey(keyObj, keyPassword), "base64");
    const c = Buffer.from(payload.kem, "base64");
    const level = payload.l || keyObj.level || 768;
    
    let ss;
    if (level === 512) ss = kyber.Decrypt512(c, sk);
    else if (level === 1024) ss = kyber.Decrypt1024(c, sk);
    else ss = kyber.Decrypt768(c, sk);
    
    const iv = Buffer.from(payload.i, "base64");
    const authTag = Buffer.from(payload.t, "base64");
    const encrypted = Buffer.from(payload.d, "base64");
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(ss), iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const outPath = filePath.replace(/\.kyber$/, "");
    fs.writeFileSync(outPath, decrypted);
    return outPath;
}

export async function signLibsodiumFile(filePath: string, keyObj: CustomKey, keyPassword?: string): Promise<string> {
    await sodium.ready;
    const fileBuf = fs.readFileSync(filePath);
    const privateKey = Buffer.from(await unlockKey(keyObj, keyPassword), "base64");
    
    // Create detached signature
    const sig = sodium.crypto_sign_detached(fileBuf, privateKey);
    const outPath = filePath + ".sig";
    fs.writeFileSync(outPath, Buffer.from(sig).toString("base64"), "utf8");
    return outPath;
}

export async function verifyLibsodiumFile(filePath: string, keyObj: CustomKey): Promise<boolean> {
    await sodium.ready;
    const sigPath = filePath + ".sig";
    if (!fs.existsSync(sigPath)) {
        throw new Error("Detached signature file (.sig) not found in the same directory.");
    }
    const fileBuf = fs.readFileSync(filePath);
    const sigBase64 = fs.readFileSync(sigPath, "utf8");
    const sig = Buffer.from(sigBase64, "base64");
    const publicKey = Buffer.from(keyObj.publicKey!, "base64");
    
    return sodium.crypto_sign_verify_detached(sig, fileBuf, publicKey);
}



export async function unlockKey(keyObj: CustomKey, password?: string): Promise<string> {
  let isEncrypted = false;
  try {
     const decoded = Buffer.from(keyObj.privateKeyBase64, "base64").toString("utf8");
     if (decoded.startsWith("{")) {
        const parsed = JSON.parse(decoded);
        if (parsed.d && parsed.i && parsed.t) {
            isEncrypted = true;
        }
     }
  } catch(e) {}

  if (isEncrypted) {
     if (!password) throw new Error(`Password is required to unlock the key: ${keyObj.name}`);
     return await decryptAes(keyObj.privateKeyBase64, password);
  }
  return keyObj.privateKeyBase64;
}
