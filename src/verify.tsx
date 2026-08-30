import { Form, ActionPanel, Action, showToast, Toast, Detail, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { verifyText, verifyFileDetached } from "./gpg";
import { verifyLibsodium, verifyLibsodiumFile } from "./crypto";
import { getCustomKeys, CustomKey } from "./keychain";
import fs from "fs";

interface Preferences {
  defaultEngine?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);
  const [engine, setEngine] = useState(preferences.defaultEngine || "gpg");
  const [customKeys, setCustomKeys] = useState<CustomKey[]>([]);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    getCustomKeys().then(setCustomKeys).catch(console.error);
  }, []);

  async function handleSubmit(values: { text?: string; files?: string[]; engine: string; customKeyId?: string; extKeyFile?: string[] }) {
    setIsLoading(true);
    setResult(null);
    try {
      const hasFiles = values.files && values.files.length > 0;
      let customKey = values.customKeyId && values.customKeyId !== "none" ? customKeys.find(k => k.id === values.customKeyId) : undefined;
      
      
      // If External Key file is selected, load it
      if (values.extKeyFile && values.extKeyFile.length > 0) {
          const filePath = values.extKeyFile[0];
          const fileData = fs.readFileSync(filePath, "utf8");
          if (values.engine === "libsodium") {
              customKey = { id: "ext", name: "ext", type: "libsodium", publicKey: fileData.trim(), privateKeyBase64: "", createdAt: 0 };
          }
      }
if (!values.text && !hasFiles) throw new Error("Please provide signed text or a file to verify.");

      if (hasFiles) {
        const filePath = values.files![0];
        let verifiedMsg = "";
        
        if (values.engine === "gpg") {
            verifiedMsg = await verifyFileDetached(filePath);
        } else if (values.engine === "libsodium") {
            if (!customKey) throw new Error("Libsodium Public Key is required for verifying");
            const isValid = await verifyLibsodiumFile(filePath, customKey);
            if (!isValid) throw new Error("Bad signature!");
            verifiedMsg = "Good signature from Libsodium Key: " + customKey.name;
        } else {
            throw new Error("Verification not supported for this engine");
        }
        showToast({ title: "Signature Verified", message: "File is authentic", style: Toast.Style.Success });
        setResult(verifiedMsg);
      } else {
        let verifiedMsg = "";
        if (values.engine === "gpg") {
          verifiedMsg = await verifyText(values.text!);
        } else if (values.engine === "libsodium") {
          if (!customKey) throw new Error("Libsodium Public Key is required for verifying");
          const originalText = await verifyLibsodium(values.text!, customKey);
          verifiedMsg = "Good signature from Libsodium Key: " + customKey.name + "\n\nOriginal Text:\n" + originalText;
        } else {
          throw new Error("Verification not supported for this engine");
        }
        showToast({ title: "Signature Verified", style: Toast.Style.Success });
        setResult(verifiedMsg);
      }
    } catch (e) {
      showToast({ title: "Verification failed", message: String(e), style: Toast.Style.Failure });
      setResult("VERIFICATION FAILED:\n" + String(e));
    }
    setIsLoading(false);
  }

  if (result) {
      return (
          <Detail 
            markdown={`\`\`\`text\n${result}\n\`\`\``} 
            actions={
              <ActionPanel>
                 <Action title="Back" onAction={() => setResult(null)} />
              </ActionPanel>
            } 
          />
      );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Verify Signature" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Signed Text" placeholder="Inline signed text payload..." />
      <Form.FilePicker id="files" title="Or select original File" allowMultipleSelection={false} info="The .sig file must be in the same directory" />
      
      <Form.Dropdown id="engine" title="Verification Engine" value={engine} onChange={setEngine}>
        <Form.Dropdown.Item value="gpg" title="GPG" />
        <Form.Dropdown.Item value="libsodium" title="Libsodium (Ed25519)" />
      </Form.Dropdown>

      {engine === "libsodium" && (
        <>
          <Form.Dropdown id="customKeyId" title="Use Saved Public Key" defaultValue="none">
             <Form.Dropdown.Item value="none" title="-- Use External Public File --" />
             {customKeys.filter(k => k.type === "libsodium").map((k) => (
               <Form.Dropdown.Item key={k.id} value={k.id} title={k.name} />
             ))}
          </Form.Dropdown>
          <Form.FilePicker id="extKeyFile" title="Or External Public Key (.sodium)" allowMultipleSelection={false} />
        </>
      )}
    </Form>
  );
}
