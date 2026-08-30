import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { saveCustomKey, CustomKey } from "./keychain";
import { encryptAes, decryptAes } from "./crypto";
import crypto from "crypto";

export default function Command() {
  const [engine, setEngine] = useState<string>("aes");
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; engine: string; privateKeyBase64: string; publicKeyBase64?: string; isPasswordProtected: boolean; currentPassword?: string; newPassword?: string; level?: string }) {
    if (!values.name || !values.privateKeyBase64) {
      await showToast({ title: "Name and Private Key are required", style: Toast.Style.Failure });
      return;
    }

    setIsLoading(true);
    try {
      let rawPrivKey = values.privateKeyBase64.trim();
      
      // If the user pasted an encrypted JSON string and wants to unlock it first
      if (values.isPasswordProtected) {
          if (!values.currentPassword) throw new Error("Current password is required to decrypt the imported key.");
          rawPrivKey = await decryptAes(rawPrivKey, values.currentPassword);
      }

      // Now re-encrypt it for LocalStorage if they want a new password
      let storagePrivKey = rawPrivKey;
      if (values.newPassword) {
          storagePrivKey = await encryptAes(rawPrivKey, values.newPassword, undefined, "argon2");
      }

      const key: CustomKey = {
        id: crypto.randomUUID(),
        name: values.name,
        type: values.engine as any,
        privateKeyBase64: storagePrivKey,
        publicKey: values.publicKeyBase64 ? values.publicKeyBase64.trim() : undefined,
        level: values.engine === "kyber" && values.level ? parseInt(values.level) as any : undefined,
        createdAt: Date.now()
      };

      await saveCustomKey(key);
      await showToast({ title: "Key Imported Successfully", style: Toast.Style.Success });
      pop();
    } catch (e) {
      await showToast({ title: "Import failed", message: String(e), style: Toast.Style.Failure });
    }
    setIsLoading(false);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="engine" title="Engine" value={engine} onChange={setEngine}>
        <Form.Dropdown.Item value="aes" title="AES-256-GCM" />
        <Form.Dropdown.Item value="kyber" title="Kyber (Post-Quantum)" />
        <Form.Dropdown.Item value="libsodium" title="Libsodium (XSalsa20-Poly1305)" />
        <Form.Dropdown.Item value="age" title="Age / Rage" />
      </Form.Dropdown>

      <Form.TextField id="name" title="Key Name" placeholder="e.g. My Backup AES Key" />
      
      {engine === "kyber" && (
        <Form.Dropdown id="level" title="Security Level" defaultValue="768">
          <Form.Dropdown.Item value="512" title="Kyber512" />
          <Form.Dropdown.Item value="768" title="Kyber768" />
          <Form.Dropdown.Item value="1024" title="Kyber1024" />
        </Form.Dropdown>
      )}

      <Form.TextArea id="privateKeyBase64" title="Private Key (Base64 or JSON)" placeholder="Paste your raw base64 key or encrypted JSON string here..." />
      
      {engine !== "aes" && (
        <Form.TextArea id="publicKeyBase64" title="Public Key (Base64)" placeholder="Paste your public key base64 here..." />
      )}

      <Form.Separator />
      
      <Form.Checkbox id="isPasswordProtected" title="Is the pasted key encrypted?" label="Yes, it requires a password to decrypt" defaultValue={false} />
      <Form.PasswordField id="currentPassword" title="Current Password" placeholder="Password to unlock the pasted key..." />

      <Form.Separator />
      
      <Form.PasswordField id="newPassword" title="New LocalStorage Password" placeholder="Leave empty to store unencrypted in Raycast..." />
      <Form.Description text="If you set a New Password, the key will be securely encrypted inside Raycast LocalStorage (highly recommended)." />

    </Form>
  );
}
