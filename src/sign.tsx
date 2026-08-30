import { Form, ActionPanel, Action, showToast, Toast, Clipboard, getPreferenceValues, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { signText, signFileDetached } from "./gpg";
import { signLibsodium, signLibsodiumFile, decryptAes } from "./crypto";
import { getCustomKeys, CustomKey } from "./keychain";
import fs from "fs";
import os from "os";
import path from "path";

interface Preferences {
  defaultEngine?: string;
  keysDirectory?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const [engine, setEngine] = useState(preferences.defaultEngine || "gpg");
  const [customKeys, setCustomKeys] = useState<CustomKey[]>([]);

  useEffect(() => {
    getCustomKeys().then(setCustomKeys).catch(console.error);
  }, []);

  async function handleSubmit(values: { text?: string; files?: string[]; engine: string; customKeyId?: string; saveAsFile: boolean; extKeyFile?: string[]; extKeyPassword?: string; keyPassword?: string }) {
    setIsLoading(true);
    try {
      let hasFiles = values.files && values.files.length > 0;
      let filePath = hasFiles ? values.files![0] : "";
      
      let customKey = values.customKeyId && values.customKeyId !== "none" ? customKeys.find(k => k.id === values.customKeyId) : undefined;
      
      
      // If External Key file is selected, load it
      if (values.extKeyFile && values.extKeyFile.length > 0) {
          const filePath = values.extKeyFile[0];
          const fileData = fs.readFileSync(filePath, "utf8");
          if (values.engine === "libsodium") {
              if (!values.extKeyPassword) throw new Error("Password is required to unlock external secret key");
              const secKeyBase64 = await decryptAes(fileData, values.extKeyPassword, undefined);
              customKey = { id: "ext", name: "ext", type: "libsodium", privateKeyBase64: secKeyBase64, createdAt: 0 };
          }
      }
if (!values.text && !hasFiles) throw new Error("Please provide text or a file to sign.");

      if (values.saveAsFile && values.text) {
          const outDir = path.join(os.homedir(), "Downloads");
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
          const createdFilePath = path.join(outDir, `text-${dateStr}.txt`);
          fs.writeFileSync(createdFilePath, values.text, "utf8");
          values.files = [createdFilePath];
          hasFiles = true;
      }

      if (hasFiles) {
        let outPath = "";
        if (values.engine === "gpg") {
            outPath = await signFileDetached(filePath);
        } else if (values.engine === "libsodium") {
            if (!customKey) throw new Error("Libsodium key is required for signing");
            outPath = await signLibsodiumFile(filePath, customKey, values.keyPassword || (preferences as any)[`defaultLibsodiumPassword`]);
        } else {
            throw new Error("Signing not supported for this engine");
        }
        
        const keyName = customKey ? customKey.name : (values.extKeyFile?.length ? "External File" : "Password Only");
        showToast({ title: "Sign Successful", message: `Used Key: ${keyName}`, style: Toast.Style.Success });
        pop();
    
      } else {
        let signed = "";
        if (values.engine === "gpg") {
          signed = await signText(values.text!);
        } else if (values.engine === "libsodium") {
          if (!customKey) throw new Error("Libsodium key is required for signing");
          signed = await signLibsodium(values.text!, customKey, values.keyPassword || (preferences as any)[`defaultLibsodiumPassword`]);
        } else {
          throw new Error("Signing not supported for this engine");
        }
        await Clipboard.copy(signed);
        
        const keyName = customKey ? customKey.name : (values.extKeyFile?.length ? "External File" : "Password Only");
        showToast({ title: "Sign Successful", message: `Used Key: ${keyName}`, style: Toast.Style.Success });
        pop();
    
      }
    } catch (e) {
      showToast({ title: "Signing failed", message: String(e), style: Toast.Style.Failure });
    }
    setIsLoading(false);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sign" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Text to Sign" placeholder="Clear text message..." />
      <Form.Checkbox id="saveAsFile" title="Options" label="Save text as File in Keys Directory before signing" defaultValue={false} />
      <Form.FilePicker id="files" title="Or select a File" allowMultipleSelection={false} />
      
      <Form.Dropdown id="engine" title="Signing Engine" value={engine} onChange={setEngine}>
        <Form.Dropdown.Item value="gpg" title="GPG" />
        <Form.Dropdown.Item value="libsodium" title="Libsodium (Ed25519)" />
      </Form.Dropdown>

      {engine === "libsodium" && (
        <>
          <Form.Dropdown id="customKeyId" title="Use Saved Key" defaultValue="none">
             <Form.Dropdown.Item value="none" title="-- Use External Secret File --" />
             {customKeys.filter(k => k.type === "libsodium").map((k) => (
               <Form.Dropdown.Item key={k.id} value={k.id} title={k.name} />
             ))}
          </Form.Dropdown>
          
          <Form.PasswordField id="keyPassword" title="Unlock Saved Key (Password)" placeholder="Leave empty to use Settings default..." />
          <Form.FilePicker id="extKeyFile" title="Or External Secret Key (.sodium)" allowMultipleSelection={false} />
          <Form.PasswordField id="extKeyPassword" title="Key Password" placeholder="Required if using external secret file..." />
        </>
      )}
    </Form>
  );
}
