import { showToast, Toast, Clipboard, LocalStorage, getPreferenceValues, getSelectedFinderItems } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";
import { getCustomKeys, CustomKey } from "./keychain";
import { encryptAes, encryptAesFile, encryptKyber, encryptKyberFile, encryptLibsodium, encryptLibsodiumFile, decryptAes, decryptAesFile, decryptKyber, decryptKyberFile, decryptLibsodium, decryptLibsodiumFile } from "./crypto";
import { encryptAge, encryptAgeFile, decryptAge, decryptAgeFile } from "./age-crypto";

export async function processQuickEncrypt(engine: "aes" | "kyber" | "libsodium" | "age") {
    try {
        const prefs = getPreferenceValues<any>();
        const prefKeyNameOrId = prefs[`default${engine.charAt(0).toUpperCase() + engine.slice(1)}Key`];
        let defaultId = await LocalStorage.getItem<string>(`default_${engine}_key`);
        
        const keys = await getCustomKeys();
        let key = keys.find(k => k.id === defaultId);
        
        if (!key && prefKeyNameOrId) {
            key = keys.find(k => k.id === prefKeyNameOrId || k.name === prefKeyNameOrId && k.type === engine);
        }
        
        if (!key) {
            await showToast({ title: "Key Not Found", message: `Default ${engine.toUpperCase()} key not found. Please set it in Settings or List Keys.`, style: Toast.Style.Failure });
            return;
        }

        let files: string[] = [];
        try {
            const finderItems = await getSelectedFinderItems();
            files = finderItems.map((i: any) => i.path);
        } catch (e) { }

        const kdf = prefs.kdfMethod;
        const password = prefs.defaultPassword;
        const keyPassword = prefs[`default${engine.charAt(0).toUpperCase() + engine.slice(1)}Password`];

        if (files.length > 0) {
            let outPath = "";
            for (const f of files) {
                if (engine === "aes") outPath = await encryptAesFile(f, password, key, kdf, keyPassword);
                else if (engine === "kyber") outPath = await encryptKyberFile(f, key);
                else if (engine === "libsodium") outPath = await encryptLibsodiumFile(f, password, key, kdf, keyPassword);
                else if (engine === "age") outPath = await encryptAgeFile(f, key.publicKey!);
            }
            await showToast({ title: "Encrypted Files", message: `Saved to ${path.dirname(files[0])}`, style: Toast.Style.Success });
        } else {
            const text = await Clipboard.readText();
            if (!text) {
                await showToast({ title: "Nothing to encrypt", message: "Select files or copy text.", style: Toast.Style.Failure });
                return;
            }
            let encrypted = "";
            if (engine === "aes") encrypted = await encryptAes(text, password, key, kdf, keyPassword);
            else if (engine === "kyber") encrypted = await encryptKyber(text, key);
            else if (engine === "libsodium") encrypted = await encryptLibsodium(text, password, key, kdf, keyPassword);
            else if (engine === "age") encrypted = await encryptAge(text, key.publicKey!);
            
            await Clipboard.copy(encrypted);
            await showToast({ title: "Encrypted & Copied", style: Toast.Style.Success });
        }
    } catch (e) {
        await showToast({ title: "Quick Encrypt Failed", message: String(e), style: Toast.Style.Failure });
    }
}

export async function processQuickDecrypt() {
    try {
        let files: string[] = [];
        try {
            const finderItems = await getSelectedFinderItems();
            files = finderItems.map((i: any) => i.path);
        } catch (e) { }

        const prefs = getPreferenceValues<any>();
        const password = prefs.defaultPassword;
        const keys = await getCustomKeys();
        const pwdAes = prefs.defaultAesPassword;
        const pwdKyb = prefs.defaultKyberPassword;
        const pwdSod = prefs.defaultLibsodiumPassword;
        
        const prefAesId = prefs.defaultAesKey;
        const prefKybId = prefs.defaultKyberKey;
        const prefSodId = prefs.defaultLibsodiumKey;

        const defAesId = await LocalStorage.getItem<string>("default_aes_key");
        const defKybId = await LocalStorage.getItem<string>("default_kyber_key");
        const defSodId = await LocalStorage.getItem<string>("default_libsodium_key");
        const defAgeId = await LocalStorage.getItem<string>("default_age_key");
        
        let aesKey = keys.find(k => k.id === defAesId) || keys.find(k => (k.id === prefAesId || k.name === prefAesId) && k.type === "aes");
        let kybKey = keys.find(k => k.id === defKybId) || keys.find(k => (k.id === prefKybId || k.name === prefKybId) && k.type === "kyber");
        let sodKey = keys.find(k => k.id === defSodId) || keys.find(k => (k.id === prefSodId || k.name === prefSodId) && k.type === "libsodium");
        let ageKey = keys.find(k => k.id === defAgeId) || keys.find(k => (k.id === prefs.defaultAgeKey || k.name === prefs.defaultAgeKey) && k.type === "age");

        if (files.length > 0) {
            let outPath = "";
            for (const f of files) {
                if (f.endsWith(".aes") && aesKey) outPath = await decryptAesFile(f, password, aesKey, pwdAes);
                else if (f.endsWith(".kyber") && kybKey) outPath = await decryptKyberFile(f, kybKey, pwdKyb);
                else if (f.endsWith(".sodium") && sodKey) outPath = await decryptLibsodiumFile(f, password, sodKey, pwdSod);
                else if (f.endsWith(".age") && ageKey) {
                    const tmpSec = path.join(os.tmpdir(), `age-sec-${Date.now()}.txt`);
                    const realPriv = pwdAes ? await decryptAes(ageKey.privateKeyBase64, pwdAes) : Buffer.from(ageKey.privateKeyBase64, "base64").toString();
                    fs.writeFileSync(tmpSec, realPriv);
                    outPath = await decryptAgeFile(f, tmpSec);
                    fs.unlinkSync(tmpSec);
                }
                else throw new Error("Unknown extension or missing default key for: " + f);
            }
            await showToast({ title: "Decrypted Files", message: `Saved to ${path.dirname(files[0])}`, style: Toast.Style.Success });
        } else {
            const text = await Clipboard.readText();
            if (!text) throw new Error("Nothing to decrypt");
            
            let decrypted = "";
            let errs = [];
            if (kybKey) { try { decrypted = await decryptKyber(text, kybKey, pwdKyb); } catch(e){ errs.push(e); } }
            if (!decrypted && aesKey) { try { decrypted = await decryptAes(text, password, aesKey, pwdAes); } catch(e){ errs.push(e); } }
            if (!decrypted && sodKey) { try { decrypted = await decryptLibsodium(text, password, sodKey, pwdSod); } catch(e){ errs.push(e); } }
            if (!decrypted && ageKey) {
                try {
                    const tmpSec = path.join(os.tmpdir(), `age-sec-${Date.now()}.txt`);
                    const realPriv = pwdAes ? await decryptAes(ageKey.privateKeyBase64, pwdAes) : Buffer.from(ageKey.privateKeyBase64, "base64").toString();
                    fs.writeFileSync(tmpSec, realPriv);
                    decrypted = await decryptAge(text, tmpSec);
                    fs.unlinkSync(tmpSec);
                } catch(e) { errs.push(e); }
            }
            
            if (!decrypted) throw new Error("Failed to decrypt text with any default key.");
            
            await Clipboard.copy(decrypted);
            await showToast({ title: "Decrypted & Copied", style: Toast.Style.Success });
        }
    } catch (e) {
        await showToast({ title: "Quick Decrypt Failed", message: String(e), style: Toast.Style.Failure });
    }
}

// Since we appended the age stuff, I'll let the user manually configure decryption or I can add it to processQuickDecrypt
// Let's modify processQuickDecrypt
