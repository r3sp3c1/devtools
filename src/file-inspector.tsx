import {
  Form,
  ActionPanel,
  Action,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import { fromFile } from "file-type";
import React from "react";

export default function Command() {
  const [filePath, setFilePath] = useState<string[]>([]);
  const [hexDump, setHexDump] = useState<string>("");
  const [fileInfo, setFileInfo] = useState<string>("Select a file to inspect");

  const handleFileChange = async (paths: string[]) => {
    if (!paths || paths.length === 0) {
      setHexDump("");
      setFileInfo("No file selected.");
      return;
    }

    const path = paths[0];
    try {
      const type = await fromFile(path);
      const stat = fs.statSync(path);

      const mime = type ? type.mime : "unknown/text";
      const ext = type ? type.ext : "unknown";

      setFileInfo(`Size: ${stat.size} bytes | Mime: ${mime} | Ext: ${ext}`);

      // Read first 256 bytes for hex dump
      const buffer = Buffer.alloc(256);
      const fd = fs.openSync(path, "r");
      const bytesRead = fs.readSync(fd, buffer, 0, 256, 0);
      fs.closeSync(fd);

      let hex = "";
      for (let i = 0; i < bytesRead; i += 16) {
        const chunk = buffer.subarray(i, i + 16);
        const hexStr = Array.from(chunk)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        const asciiStr = Array.from(chunk)
          .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
          .join("");
        hex += `${i.toString(16).padStart(8, "0")}  ${hexStr.padEnd(48, " ")}  |${asciiStr}|\n`;
      }
      setHexDump(hex || "Empty file");
    } catch (e) {
      setFileInfo("Error reading file.");
      setHexDump("");
    }
  };

  useEffect(() => {
    async function fetchSelected() {
      try {
        const items = await getSelectedFinderItems();
        if (items && items.length > 0) {
          const path = items[0].path;
          setFilePath([path]);
          handleFileChange([path]);
        }
      } catch (e) {
        // No selection
      }
    }
    fetchSelected();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Hex Dump" content={hexDump} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Select File"
        value={filePath}
        onChange={(val) => {
          setFilePath(val);
          handleFileChange(val);
        }}
        allowMultipleSelection={false}
      />
      <Form.Separator />
      <Form.Description title="File Info" text={fileInfo} />
      <Form.TextArea
        id="hex"
        title="Magic Bytes / Hex Dump"
        value={hexDump}
        onChange={setHexDump}
        info="First 256 bytes of the file"
      />
    </Form>
  );
}
