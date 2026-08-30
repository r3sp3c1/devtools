import {
  Form,
  ActionPanel,
  Action,
  getSelectedFinderItems,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import React from "react";

interface Preferences {
  defaultArchiveFormat: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [output, setOutput] = useState<string>("");

  useEffect(() => {
    async function fetchSelected() {
      try {
        const items = await getSelectedFinderItems();
        if (items && items.length > 0) {
          setFilePaths(items.map((item) => item.path));
        }
      } catch (e) {
        // No selection
      }
    }
    fetchSelected();
  }, []);

  const runCmd = (cmd: string, cwd: string, successMsg: string, outFile?: string) => {
    exec(cmd, { cwd, maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
      if (error) {
        setOutput(`Error: ${stderr || error.message}`);
        showToast({
          style: Toast.Style.Failure,
          title: "Archive operation failed",
        });
      } else {
        setOutput(`${successMsg}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`);
        showToast({ style: Toast.Style.Success, title: "Success" });
        if (outFile && fs.existsSync(outFile)) {
          exec(`open -R "${outFile}"`);
        }
      }
    });
  };

  const [format, setFormat] = useState<string>(preferences.defaultArchiveFormat || "zip");
  
  const [outPath, setOutPath] = useState<string>(() => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const d = new Date();
    const ts = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    return `~/Downloads/compressedData-${ts}`;
  });

  const compress = () => {
    if (filePaths.length === 0) return;

    // Use the directory of the first file as working directory
    const cwd = path.dirname(filePaths[0]);
    const fileNames = filePaths.map((p) => `"${path.basename(p)}"`).join(" ");

    let cmd = "";
    let msg = "";

    // Resolve outPath (~ to homedir)
    let resolvedOut = outPath;
    if (resolvedOut.startsWith("~/")) {
      resolvedOut = path.join(os.homedir(), resolvedOut.slice(2));
    } else if (!resolvedOut.startsWith("/")) {
      resolvedOut = path.join(cwd, resolvedOut);
    }
    
    // Ensure extension
    if (format === "zip" && !resolvedOut.toLowerCase().endsWith(".zip")) resolvedOut += ".zip";
    if (format === "tar.gz" && !resolvedOut.toLowerCase().endsWith(".tar.gz")) resolvedOut += ".tar.gz";
    if (format === "tar" && !resolvedOut.toLowerCase().endsWith(".tar") && !resolvedOut.toLowerCase().endsWith(".tar.gz")) resolvedOut += ".tar";

    if (format === "zip") {
      cmd = `zip -rq "${resolvedOut}" ${fileNames}`;
      msg = `Created ${resolvedOut}`;
    } else if (format === "tar.gz") {
      cmd = `tar -czf "${resolvedOut}" ${fileNames}`;
      msg = `Created ${resolvedOut}`;
    } else if (format === "tar") {
      cmd = `tar -cf "${resolvedOut}" ${fileNames}`;
      msg = `Created ${resolvedOut}`;
    }

    runCmd(cmd, cwd, msg, resolvedOut);
  };

  const extract = () => {
    if (filePaths.length === 0) return;

    const cwd = path.dirname(filePaths[0]);
    const file = path.basename(filePaths[0]);
    const ext = path.extname(file).toLowerCase();

    let cmd = "";
    let msg = "";

    // Create an extraction folder based on archive name
    const folderName =
      file.replace(/\.(zip|tar\.gz|tgz|tar)$/i, "") + "_extracted";
    const resolvedOut = path.join(cwd, folderName);

    if (ext === ".zip") {
      cmd = `unzip -q "${file}" -d "${folderName}"`;
      msg = `Extracted to ${folderName}`;
    } else if (
      file.toLowerCase().endsWith(".tar.gz") ||
      ext === ".tgz" ||
      ext === ".tar"
    ) {
      cmd = `mkdir -p "${folderName}" && tar -xf "${file}" -C "${folderName}"`;
      msg = `Extracted to ${folderName}`;
    } else {
      setOutput(
        "Unsupported archive type for extraction. Please select a .zip, .tar, or .tar.gz file.",
      );
      return;
    }

    runCmd(cmd, cwd, msg, resolvedOut);
  };

  const isExtractable =
    filePaths.length === 1 &&
    (filePaths[0].toLowerCase().endsWith(".zip") ||
      filePaths[0].toLowerCase().endsWith(".tar.gz") ||
      filePaths[0].toLowerCase().endsWith(".tgz") ||
      filePaths[0].toLowerCase().endsWith(".tar"));

  return (
    <Form
      actions={
        <ActionPanel>
          {!isExtractable && (
            <Action.SubmitForm
              title={`Compress to ${format.toUpperCase()}`}
              onSubmit={compress}
            />
          )}
          {isExtractable && (
            <Action.SubmitForm title="Extract Archive" onSubmit={extract} />
          )}
          <Action.CopyToClipboard title="Copy Output" content={output} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="files"
        title="Selected Files/Folders (Paths)"
        value={filePaths.join("\n")}
        onChange={(val) => setFilePaths(val.split("\n").filter(p => p.trim() !== ""))}
        info="One absolute path per line. Auto-filled from Finder selection."
      />
      {!isExtractable && (
        <Form.TextField
          id="outPath"
          title="Output Path / Name"
          value={outPath}
          onChange={setOutPath}
          placeholder="~/Downloads/compressedData"
        />
      )}
      {!isExtractable && (
        <Form.Dropdown
          id="format"
          title="Format"
          value={format}
          onChange={setFormat}
        >
          <Form.Dropdown.Item value="zip" title="ZIP" />
          <Form.Dropdown.Item value="tar.gz" title="TAR.GZ" />
          <Form.Dropdown.Item value="tar" title="TAR" />
        </Form.Dropdown>
      )}
      <Form.Separator />
      <Form.TextArea
        id="output"
        title="Log / Result"
        value={output}
        onChange={setOutput}
      />
    </Form>
  );
}
