import { Form, ActionPanel, Action, showToast, Toast, useNavigation, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { generateKey as generateGpgKey, exportGpgKey } from "./gpg";
import { generateAesKey, generateLibsodiumKey, generateKyberKey, generateAgeCustomKey } from "./keychain";
import { encryptAes } from "./crypto";
import fs from "fs";
import os from "os";
import path from "path";

interface Preferences {
  defaultEngine?: string;
  kyberLevel?: string;
  keysDirectory?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [engine, setEngine] = useState(preferences.defaultEngine || "gpg");
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; email?: string; engine: string; kyberLevel?: string; exportPassword?: string }) {
    setIsLoading(true);
    try {
      const keysDir = (preferences.keysDirectory || "~/Downloads/encryption-keys").replace(/^~/, os.homedir());
      const safeName = values.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
      const baseFilename = `${safeName}-${dateStr}`;

      if (values.engine === "gpg") {
        if (!values.email) throw new Error("Email required for GPG");
        await generateGpgKey(values.name, values.email);
        
        const gpgDir = path.join(keysDir, "GPG");
        await exportGpgKey(values.email, gpgDir, baseFilename);
        showToast({ title: "GPG Key Generated & Exported", message: `Saved to ${gpgDir}`, style: Toast.Style.Success });
        
      } else if (values.engine === "aes") {
        const key = await generateAesKey(values.name, values.exportPassword);
        
        if (values.exportPassword) {
            const aesDir = path.join(keysDir, "AES");
            if (!fs.existsSync(aesDir)) fs.mkdirSync(aesDir, { recursive: true });
            const secPath = path.join(aesDir, `${baseFilename}-sec.aes`);
            fs.writeFileSync(secPath, key.privateKeyBase64);
            showToast({ title: "AES Key Generated & Exported", message: `Saved to ${aesDir}`, style: Toast.Style.Success });
        } else {
            showToast({ title: "AES Key Generated", style: Toast.Style.Success });
        }
        
      } else if (values.engine === "kyber") {
        const level = parseInt(values.kyberLevel || preferences.kyberLevel || "768", 10) as 512 | 768 | 1024;
        const key = await generateKyberKey(values.name, level, values.exportPassword);
        
        if (values.exportPassword) {
            const kyberDir = path.join(keysDir, "Kyber");
            if (!fs.existsSync(kyberDir)) fs.mkdirSync(kyberDir, { recursive: true });
            
            const pubPath = path.join(kyberDir, `${baseFilename}-pub.kyber`);
            const secPath = path.join(kyberDir, `${baseFilename}-sec.kyber`);
            
            fs.writeFileSync(pubPath, JSON.stringify({ pk: key.publicKey, level: key.level }));
            fs.writeFileSync(secPath, key.privateKeyBase64);
            
            showToast({ title: "Kyber Keys Exported", message: `Saved to ${kyberDir}`, style: Toast.Style.Success });
        } else {
            showToast({ title: "Kyber Key Generated", style: Toast.Style.Success });
        }
        
      } else if (values.engine === "libsodium") {
        const key = await generateLibsodiumKey(values.name, values.exportPassword);
        
        if (values.exportPassword) {
            const sodiumDir = path.join(keysDir, "Libsodium");
            if (!fs.existsSync(sodiumDir)) fs.mkdirSync(sodiumDir, { recursive: true });
            
            const pubPath = path.join(sodiumDir, `${baseFilename}-pub.sodium`);
            const secPath = path.join(sodiumDir, `${baseFilename}-sec.sodium`);
            
            fs.writeFileSync(pubPath, key.publicKey!);
            fs.writeFileSync(secPath, key.privateKeyBase64);
            
            showToast({ title: "Libsodium Keys Exported", message: `Saved to ${sodiumDir}`, style: Toast.Style.Success });
        } else {
            showToast({ title: "Libsodium Key Generated", style: Toast.Style.Success });
        }
      } else if (values.engine === "age") {
        const key = await generateAgeCustomKey(values.name, values.exportPassword);
        
        if (values.exportPassword) {
            const ageDir = path.join(keysDir, "Age");
            if (!fs.existsSync(ageDir)) fs.mkdirSync(ageDir, { recursive: true });
            
            const pubPath = path.join(ageDir, `${baseFilename}-pub.txt`);
            const secPath = path.join(ageDir, `${baseFilename}-sec.txt`);
            
            fs.writeFileSync(pubPath, key.publicKey!);
            fs.writeFileSync(secPath, key.privateKeyBase64);
            
            showToast({ title: "Age Keys Exported", message: `Saved to ${ageDir}`, style: Toast.Style.Success });
        } else {
            showToast({ title: "Age Key Generated", style: Toast.Style.Success });
        }
      }
      
      pop();
    } catch (e) {
      showToast({ title: "Failed to generate key", message: String(e), style: Toast.Style.Failure });
    }
    setIsLoading(false);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="engine" title="Key Type" value={engine} onChange={setEngine}>
        <Form.Dropdown.Item value="gpg" title="GPG" />
        <Form.Dropdown.Item value="aes" title="AES-256 (256-Bit / 32-Byte Secret)" />
        <Form.Dropdown.Item value="libsodium" title="Libsodium (Ed25519 Keypair)" />
        <Form.Dropdown.Item value="kyber" title="Kyber (PQC Hybrid AES Keypair)" />
        <Form.Dropdown.Item value="age" title="Age / Rage Keypair" />
      </Form.Dropdown>

      <Form.TextField id="name" title={engine === "gpg" ? "Full Name" : "Key / File Name"} placeholder="John Doe / My Backup Key" />
      
      {engine === "kyber" && (
        <Form.Dropdown id="kyberLevel" title="Kyber Security Level" defaultValue={preferences.kyberLevel || "768"}>
          <Form.Dropdown.Item value="512" title="Kyber512 (AES-128 equivalent)" />
          <Form.Dropdown.Item value="768" title="Kyber768 (AES-192 equivalent)" />
          <Form.Dropdown.Item value="1024" title="Kyber1024 (AES-256 equivalent)" />
        </Form.Dropdown>
      )}

      {engine === "gpg" && (
        <Form.TextField id="email" title="Email" placeholder="john@example.com" />
      )}

      {engine !== "gpg" && (
        <Form.PasswordField id="exportPassword" title="Export Password (Optional)" placeholder="Encrypts the secret key file on export..." />
      )}
    </Form>
  );
}
