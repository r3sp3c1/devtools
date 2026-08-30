import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import React from "react";

export default function Command() {
  const [type, setType] = useState<string>("ed25519");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const generateKey = (values: {
    type: string;
    size: string;
    folder: string;
    filename: string;
    passphrase?: string;
    comment?: string;
  }) => {
    const home = os.homedir();
    const resolvedFolder = values.folder.replace(/^~/, home);

    try {
      if (!fs.existsSync(resolvedFolder)) {
        fs.mkdirSync(resolvedFolder, { recursive: true });
      }
    } catch (e: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot create folder",
        message: e.message,
      });
      return;
    }

    let defaultName = `id_${values.type}`;
    if (!values.filename) {
      values.filename = defaultName;
    }

    const fullPath = path.join(resolvedFolder, values.filename);

    if (fs.existsSync(fullPath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Key already exists!",
        message: fullPath,
      });
      setOutput(
        `Error: The file ${fullPath} already exists.\nPlease choose a different filename or delete the existing key.`,
      );
      return;
    }

    setLoading(true);

    const args = ["-t", values.type];

    // Add bit size for RSA and ECDSA
    if (values.type === "rsa" || values.type === "ecdsa") {
      args.push("-b", values.size);
    }

    args.push("-f", fullPath);
    args.push("-N", values.passphrase || "");

    if (values.comment) {
      args.push("-C", values.comment);
    }

    execFile("ssh-keygen", args, (err, stdout, stderr) => {
      setLoading(false);
      if (err) {
        setOutput("Error:\n" + err.message + "\n\n" + stderr);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to generate key",
        });
      } else {
        setOutput(
          `Success! 🛡️\n\n${stdout}\n\nKey securely saved to:\n${fullPath}\nPublic Key:\n${fullPath}.pub\n\n(Note: You can now load this key into your SSH Session Manager)`,
        );
        showToast({ style: Toast.Style.Success, title: "SSH Key Generated!" });
      }
    });
  };

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate SSH Key"
            icon={Icon.Key}
            onSubmit={generateKey}
          />
          <Action.CopyToClipboard title="Copy Output" content={output} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Key Type" value={type} onChange={setType}>
        <Form.Dropdown.Item
          value="ed25519"
          title="ED25519 (Recommended, Fastest, Most Secure)"
        />
        <Form.Dropdown.Item value="rsa" title="RSA (Legacy Compatibility)" />
        <Form.Dropdown.Item value="ecdsa" title="ECDSA (Elliptic Curve)" />
      </Form.Dropdown>

      {type === "rsa" && (
        <Form.Dropdown id="size" title="Key Size (Bits)" defaultValue="4096">
          <Form.Dropdown.Item value="2048" title="2048" />
          <Form.Dropdown.Item value="3072" title="3072" />
          <Form.Dropdown.Item value="4096" title="4096 (Recommended)" />
        </Form.Dropdown>
      )}

      {type === "ecdsa" && (
        <Form.Dropdown id="size" title="Key Size (Bits)" defaultValue="521">
          <Form.Dropdown.Item value="256" title="256" />
          <Form.Dropdown.Item value="384" title="384" />
          <Form.Dropdown.Item value="521" title="521 (Recommended)" />
        </Form.Dropdown>
      )}

      <Form.Separator />
      <Form.TextField
        id="folder"
        title="Save Folder"
        defaultValue="~/Documents/ssh"
        placeholder="~/Documents/ssh"
      />
      <Form.TextField
        id="filename"
        title="Filename"
        defaultValue={`id_${type}`}
        placeholder={`id_${type}`}
      />

      <Form.Separator />
      <Form.PasswordField
        id="passphrase"
        title="Passphrase (Optional)"
        placeholder="Leave empty for no password"
      />
      <Form.TextField
        id="comment"
        title="Comment (Optional)"
        placeholder="user@macbook-pro"
        defaultValue="generated-by-raycast"
      />

      <Form.Separator />
      <Form.TextArea
        id="output"
        title="Generator Log"
        value={output}
        onChange={setOutput}
      />
    </Form>
  );
}
