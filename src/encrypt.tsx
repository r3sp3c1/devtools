import { Form, ActionPanel, Action, showToast, Toast, Clipboard, getPreferenceValues, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { encryptText, listKeys, GpgKey } from "./gpg";
import { encryptAes, encryptKyber, encryptLibsodium, encryptAesFile, encryptKyberFile, encryptLibsodiumFile, decryptAes } from "./crypto";
import { encryptAge, encryptAgeFile } from "./age-crypto";
import { getCustomKeys, CustomKey } from "./keychain";
import fs from "fs";
import os from "os";
import path from "path";

interface Preferences {
  kdfMethod?: string;
  defaultEngine?: string;
  symmetricEncryption: boolean;
  defaultPassword?: string;
  keysDirectory?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const [keys, setKeys] = useState<GpgKey[]>([]);
  const [customKeys, setCustomKeys] = useState<CustomKey[]>([]);
  const [engine, setEngine] = useState(preferences.defaultEngine || "gpg");
  const [symmetric, setSymmetric] = useState(preferences.symmetricEncryption);

  useEffect(() => {
    listKeys().then(setKeys).catch(console.error);
    getCustomKeys().then(setCustomKeys).catch(console.error);
  }, []);

  async function handleSubmit(values: { text?: string; files?: string[]; engine: string; recipient?: string; symmetric: boolean; password?: string; customKeyId?: string; extKeyFile?: string[]; extKeyPassword?: string; saveAsFile?: boolean; keyPassword?: string }) {
    setIsLoading(true);
    try {
      let hasFiles = values.files && values.files.length > 0;
      let customKey = values.customKeyId && values.customKeyId !== "none" ? customKeys.find(k => k.id === values.customKeyId) : undefined;
      const passwordToUse = values.password || preferences.defaultPassword;
      
      if (!values.text && !hasFiles) throw new Error("Please provide text or a file to encrypt.");
      if (values.saveAsFile && values.text) {
          const outDir = path.join(os.homedir(), "Downloads");
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
          const createdFilePath = path.join(outDir, `text-${dateStr}.txt`);
          fs.writeFileSync(createdFilePath, values.text, "utf8");
          values.files = [createdFilePath];
          hasFiles = true;
      }


      // If External Key file is selected, load it
      if (values.extKeyFile && values.extKeyFile.length > 0) {
          const filePath = values.extKeyFile[0];
          const fileData = fs.readFileSync(filePath, "utf8");
          
          if (values.engine === "kyber") {
              const pubData = JSON.parse(fileData);
              customKey = { id: "ext", name: "ext", type: "kyber", publicKey: pubData.pk, level: pubData.level, privateKeyBase64: "", createdAt: 0 };
          } else if (values.engine === "libsodium") {
              customKey = { id: "ext", name: "ext", type: "libsodium", publicKey: fileData.trim(), privateKeyBase64: "", createdAt: 0 };
          } else if (values.engine === "age") {
              customKey = { id: "ext", name: "ext", type: "age", publicKey: fileData.trim(), privateKeyBase64: "", createdAt: 0 };
          } else if (values.engine === "aes") {
              if (!values.extKeyPassword) throw new Error("Password is required to unlock external AES key");
              const secKeyBase64 = await decryptAes(fileData, values.extKeyPassword, undefined);
              customKey = { id: "ext", name: "ext", type: "aes", privateKeyBase64: secKeyBase64, createdAt: 0 };
          }
      }

      if (hasFiles) {
        // File Encryption
        const filePath = values.files![0]; // Encrypt first file for now
        let outPath = "";
        
        if (values.engine === "gpg") {
            outPath = await encryptText("", values.recipient, values.symmetric, filePath);
        } else if (values.engine === "aes") {
            if (!passwordToUse && !customKey) throw new Error("Password or Key is required for AES");
            outPath = await encryptAesFile(filePath, passwordToUse, customKey, "argon2", values.keyPassword || (preferences as any)[`default${values.engine.charAt(0).toUpperCase() + values.engine.slice(1)}Password`]);
        } else if (values.engine === "kyber") {
            if (!customKey) throw new Error("A saved Kyber key or an external Public Key file is required");
            outPath = await encryptKyberFile(filePath, customKey);
        } else if (values.engine === "libsodium") {
            if (!passwordToUse && !customKey) throw new Error("Password or Key is required for Libsodium");
            outPath = await encryptLibsodiumFile(filePath, passwordToUse, customKey, "argon2", values.keyPassword || (preferences as any)[`default${values.engine.charAt(0).toUpperCase() + values.engine.slice(1)}Password`]);
        } else if (values.engine === "age") {
            if (!customKey) throw new Error("A saved Age key or an external Public Key file is required");
            outPath = await encryptAgeFile(filePath, customKey.publicKey!);
        }
        
        const keyName = customKey ? customKey.name : (values.extKeyFile?.length ? "External File" : "Password Only");
        showToast({ title: "Encryption Successful", message: `Used Key: ${keyName}`, style: Toast.Style.Success });
        pop();
    
      } else {
        // Text Encryption
        let encrypted = "";
        if (values.engine === "gpg") {
          encrypted = await encryptText(values.text!, values.recipient, values.symmetric);
        } else if (values.engine === "aes") {
          if (!passwordToUse && !customKey) throw new Error("Password or Key is required for AES");
          encrypted = await encryptAes(values.text!, passwordToUse, customKey, "argon2", values.keyPassword || (preferences as any)[`default${values.engine.charAt(0).toUpperCase() + values.engine.slice(1)}Password`]);
        } else if (values.engine === "kyber") {
          if (!customKey) throw new Error("A saved Kyber key or an external Public Key file is required");
          encrypted = await encryptKyber(values.text!, customKey);
        } else if (values.engine === "libsodium") {
          if (!passwordToUse && !customKey) throw new Error("Password or Key is required for Libsodium");
          encrypted = await encryptLibsodium(values.text!, passwordToUse, customKey, "argon2", values.keyPassword || (preferences as any)[`default${values.engine.charAt(0).toUpperCase() + values.engine.slice(1)}Password`]);
        } else if (values.engine === "age") {
          if (!customKey) throw new Error("A saved Age key or an external Public Key file is required");
          encrypted = await encryptAge(values.text!, customKey.publicKey!);
        }

        await Clipboard.copy(encrypted);
        
        const keyName = customKey ? customKey.name : (values.extKeyFile?.length ? "External File" : "Password Only");
        showToast({ title: "Encryption Successful", message: `Used Key: ${keyName}`, style: Toast.Style.Success });
        pop();
    
      }
    } catch (e) {
      showToast({ title: "Encryption failed", message: String(e), style: Toast.Style.Failure });
    }
    setIsLoading(false);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Encrypt" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text to Encrypt" placeholder="Secret message..." />
      <Form.Checkbox id="saveAsFile" title="Options" label="Save text as File before encrypting" defaultValue={false} />
      <Form.FilePicker id="files" title="Or select a File" allowMultipleSelection={false} />
      
      <Form.Dropdown id="engine" title="Encryption Engine" value={engine} onChange={setEngine}>
        <Form.Dropdown.Item value="gpg" title="GPG" />
        <Form.Dropdown.Item value="aes" title="AES-256-GCM" />
        <Form.Dropdown.Item value="libsodium" title="Libsodium (XSalsa20-Poly1305)" />
        <Form.Dropdown.Item value="kyber" title="Kyber (PQC Hybrid AES)" />
        <Form.Dropdown.Item value="age" title="Age / Rage" />
      </Form.Dropdown>

      {engine === "gpg" && (
        <>
          <Form.Checkbox id="symmetric" title="GPG Options" label="Use Password Only (Symmetric)" value={symmetric} onChange={setSymmetric} />
          {!symmetric && (
            <Form.Dropdown id="recipient" title="Recipient">
              {keys.map((k) => (
                <Form.Dropdown.Item key={k.fingerprint} value={k.fingerprint} title={`${k.uids[0] || 'Unknown'} (${k.id})`} />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}

      {(engine === "aes" || engine === "libsodium" || engine === "kyber" || engine === "age") && (
        <>
          <Form.Dropdown id="customKeyId" title="Use Saved Key" defaultValue="none">
             <Form.Dropdown.Item value="none" title={engine === "aes" ? "-- Password Only / Ext File --" : (engine === "kyber" || engine === "age" ? "-- Use External Pubkey File --" : "-- Password Only / Ext File --")} />
             {customKeys.filter(k => k.type === engine).map((k) => (
               <Form.Dropdown.Item key={k.id} value={k.id} title={k.name} />
             ))}
          </Form.Dropdown>
          
          
          {engine !== "age" && <Form.PasswordField id="keyPassword" title="Unlock Saved Key (Password)" placeholder="Leave empty to use Settings default..." />}
          <Form.FilePicker id="extKeyFile" title={engine === "aes" ? "Or External Secret Key" : "Or External Public Key"} allowMultipleSelection={false} />

          {engine === "aes" && (
            <Form.PasswordField id="extKeyPassword" title="Key Password" placeholder="Password if unlocking an external secret key..." />
          )}

          {(engine !== "kyber" && engine !== "age") && (
            <Form.PasswordField id="password" title="Password" placeholder="Required if no key selected..." defaultValue={preferences.defaultPassword} />
          )}
        </>
      )}
    </Form>
  );
}
