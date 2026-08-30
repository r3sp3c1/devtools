import {
  List,
  ActionPanel,
  Action,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useEffect } from "react";
import crypto from "crypto";
import fs from "fs";

export default function Command() {
  const [input, setInput] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);

  const [fileHashes, setFileHashes] = useState({
    md5: "",
    sha1: "",
    sha256: "",
    sha512: "",
  });
  const [isHashing, setIsHashing] = useState(false);

  // 1. On mount, check if there's a selected file in Finder
  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        if (items.length > 0) {
          try {
            if (fs.statSync(items[0].path).isFile()) {
              setFilePath(items[0].path);
            }
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  // 2. If we have a file path, calculate hashes using streams
  useEffect(() => {
    if (!filePath) return;

    let isCancelled = false;
    setIsHashing(true);

    const md5 = crypto.createHash("md5");
    const sha1 = crypto.createHash("sha1");
    const sha256 = crypto.createHash("sha256");
    const sha512 = crypto.createHash("sha512");

    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => {
      md5.update(chunk);
      sha1.update(chunk);
      sha256.update(chunk);
      sha512.update(chunk);
    });

    stream.on("end", () => {
      if (!isCancelled) {
        setFileHashes({
          md5: md5.digest("hex"),
          sha1: sha1.digest("hex"),
          sha256: sha256.digest("hex"),
          sha512: sha512.digest("hex"),
        });
        setIsHashing(false);
      }
    });

    stream.on("error", () => {
      if (!isCancelled) setIsHashing(false);
    });

    return () => {
      isCancelled = true;
      stream.destroy();
    };
  }, [filePath]);

  // If user types text, hash the text immediately. If empty, use file hashes (if available).
  const isTextMode = input.length > 0 || !filePath;
  const textToHash = input || "";

  const md5Val = isTextMode
    ? crypto.createHash("md5").update(textToHash).digest("hex")
    : fileHashes.md5;
  const sha1Val = isTextMode
    ? crypto.createHash("sha1").update(textToHash).digest("hex")
    : fileHashes.sha1;
  const sha256Val = isTextMode
    ? crypto.createHash("sha256").update(textToHash).digest("hex")
    : fileHashes.sha256;
  const sha512Val = isTextMode
    ? crypto.createHash("sha512").update(textToHash).digest("hex")
    : fileHashes.sha512;

  const fileName = filePath ? filePath.split("/").pop() : "";
  const placeholder = filePath
    ? `File: ${fileName} (Type to hash text instead)`
    : "Enter text to hash...";

  return (
    <List
      filtering={false}
      onSearchTextChange={setInput}
      isLoading={isHashing && !isTextMode}
      searchBarPlaceholder={placeholder}
    >
      <List.Item
        id="sha256"
        title="SHA256"
        subtitle={sha256Val}
        accessories={[{ text: "SHA256" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={sha256Val} />
          </ActionPanel>
        }
      />
      <List.Item
        id="md5"
        title="MD5"
        subtitle={md5Val}
        accessories={[{ text: "MD5" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={md5Val} />
          </ActionPanel>
        }
      />
      <List.Item
        id="sha1"
        title="SHA1"
        subtitle={sha1Val}
        accessories={[{ text: "SHA1" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={sha1Val} />
          </ActionPanel>
        }
      />
      <List.Item
        id="sha512"
        title="SHA512"
        subtitle={sha512Val}
        accessories={[{ text: "SHA512" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={sha512Val} />
          </ActionPanel>
        }
      />
    </List>
  );
}
