import { Form, ActionPanel, Action, showToast, Toast, Clipboard, getPreferenceValues, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCustomKeys, CustomKey } from "./keychain";
import { decryptAes, decryptAesFile, decryptKyber, decryptKyberFile, decryptLibsodium, decryptLibsodiumFile } from "./crypto";
import { decryptAge, decryptAgeFile } from "./age-crypto";
import { decryptText } from "./gpg";
import fs from "fs";
import path from "path";
import os from "os";

export default function Command() {
  const [engine, setEngine] = useState<string>("gpg");
  const [customKeys, setCustomKeys] = useState<CustomKey[]>([]);
  const [decryptedText, setDecryptedText] = useState("");
  const { pop } = useNavigation();

  useEffect(() => { getCustomKeys().then(setCustomKeys); }, []);
  const preferences = getPreferenceValues<any>();

  async function handleSubmit(values: { engine: string; text?: string; passwordOnly?: boolean; keyId?: string; extKeyFile?: string[]; extKeyPassword?: string; keyPassword?: string }) {
    try {
      let customKey: CustomKey | undefined;
      
      if (values.engine !== "gpg") {
        if (!values.passwordOnly) {
          if (values.keyId === "ext") {
            if (!values.extKeyFile || values.extKeyFile.length === 0) throw new Error("Please select an external key file");
            const fileData = fs.readFileSync(values.extKeyFile[0], "utf8");
            let secKeyBase64 = fileData;
            if (values.extKeyPassword) secKeyBase64 = await decryptAes(fileData, values.extKeyPassword, undefined); 
            
            customKey = { id: "ext", name: "ext", type: values.engine as any, privateKeyBase64: secKeyBase64, createdAt: 0 };
          } else {
            customKey = customKeys.find((k) => k.id === values.keyId);
            if (!customKey) throw new Error("Selected key not found");
          }
        }
      }

      const passwordToUse = values.passwordOnly ? preferences.defaultPassword : undefined;
      const keyName = customKey ? customKey.name : (values.extKeyFile?.length ? "External File" : "Password Only");

      let hasFiles = false;
      let filePath = "";
      
      try {
        if (values.text && fs.existsSync(values.text.trim())) {
          hasFiles = true;
          filePath = values.text.trim();
        }
      } catch (e) {}

      if (hasFiles) {
        let outPath = "";
        if (values.engine === "gpg") { outPath = await decryptText("", filePath); }
        else if (values.engine === "aes") { outPath = await decryptAesFile(filePath, passwordToUse, customKey, values.keyPassword || preferences.defaultAesPassword); }
        else if (values.engine === "kyber") { outPath = await decryptKyberFile(filePath, customKey!, values.keyPassword || preferences.defaultKyberPassword); }
        else if (values.engine === "libsodium") { outPath = await decryptLibsodiumFile(filePath, passwordToUse, customKey, values.keyPassword || preferences.defaultLibsodiumPassword); }
        else if (values.engine === "age") {
            const tmpSec = path.join(os.tmpdir(), `age-sec-${Date.now()}.txt`);
            const realPriv = values.keyPassword ? await decryptAes(customKey!.privateKeyBase64, values.keyPassword) : Buffer.from(customKey!.privateKeyBase64, "base64").toString();
            fs.writeFileSync(tmpSec, realPriv);
            outPath = await decryptAgeFile(filePath, tmpSec);
            fs.unlinkSync(tmpSec);
        }
        showToast({ title: "File Decrypted", message: `Used Key: ${keyName}`, style: Toast.Style.Success });
        pop();
      } else {
        let decrypted = "";
        if (values.engine === "gpg") { decrypted = await decryptText(values.text!); }
        else if (values.engine === "aes") { decrypted = await decryptAes(values.text!, passwordToUse, customKey, values.keyPassword || preferences.defaultAesPassword); }
        else if (values.engine === "kyber") { decrypted = await decryptKyber(values.text!, customKey!, values.keyPassword || preferences.defaultKyberPassword); }
        else if (values.engine === "libsodium") { decrypted = await decryptLibsodium(values.text!, passwordToUse, customKey, values.keyPassword || preferences.defaultLibsodiumPassword); }
        else if (values.engine === "age") {
            const tmpSec = path.join(os.tmpdir(), `age-sec-${Date.now()}.txt`);
            const realPriv = values.keyPassword ? await decryptAes(customKey!.privateKeyBase64, values.keyPassword) : Buffer.from(customKey!.privateKeyBase64, "base64").toString();
            fs.writeFileSync(tmpSec, realPriv);
            decrypted = await decryptAge(values.text!, tmpSec);
            fs.unlinkSync(tmpSec);
        }
        setDecryptedText(decrypted);
        showToast({ title: "Decrypted", message: `Used Key: ${keyName}`, style: Toast.Style.Success });
      }
    } catch (e) {
      showToast({ title: "Decryption failed", message: String(e), style: Toast.Style.Failure });
    }
  }

  if (decryptedText) {
    return (
      <Form actions={<ActionPanel><Action.CopyToClipboard title="Copy to Clipboard" content={decryptedText} /></ActionPanel>}>
        <Form.TextArea id="res" title="Decrypted Text" value={decryptedText} onChange={() => {}} />
      </Form>
    );
  }

  return (
    <Form actions={<ActionPanel><Action.SubmitForm title="Decrypt" onSubmit={handleSubmit} /></ActionPanel>}>
      <Form.Dropdown id="engine" title="Engine" value={engine} onChange={setEngine}>
        <Form.Dropdown.Item value="gpg" title="GPG" />
        <Form.Dropdown.Item value="aes" title="AES-256-GCM" />
        <Form.Dropdown.Item value="kyber" title="Kyber (Post-Quantum)" />
        <Form.Dropdown.Item value="libsodium" title="Libsodium (XSalsa20-Poly1305)" />
        <Form.Dropdown.Item value="age" title="Age / Rage" />
      </Form.Dropdown>
      
      {engine !== "gpg" && (
        <>
          <Form.Checkbox id="passwordOnly" label="Password Only (Symmetric)" defaultValue={false} />
          <Form.Dropdown id="keyId" title="Use Saved Key">
            {customKeys.filter((k) => k.type === engine).map((k) => (
              <Form.Dropdown.Item key={k.id} value={k.id} title={k.name} />
            ))}
            <Form.Dropdown.Item value="ext" title="-- Use External Secret File --" />
          </Form.Dropdown>
          <Form.PasswordField id="keyPassword" title="Unlock Saved Key (Password)" placeholder="Leave empty to use Settings default..." />
          <Form.FilePicker id="extKeyFile" title="External Secret File" allowMultipleSelection={false} />
          <Form.PasswordField id="extKeyPassword" title="External File Password" />
        </>
      )}

      <Form.TextArea id="text" title="Encrypted Text / File Path" placeholder="Paste base64 or file path here" />
    </Form>
  );
}
