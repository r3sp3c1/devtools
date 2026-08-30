import { Form, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import React from "react";

export default function Command() {
  const [url, setUrl] = useState<string>(
    "https://api.example.com/search?q=raycast&limit=10#results",
  );
  const [protocol, setProtocol] = useState<string>("");
  const [host, setHost] = useState<string>("");
  const [path, setPath] = useState<string>("");
  const [params, setParams] = useState<string>("");
  const [hash, setHash] = useState<string>("");
  const [encoded, setEncoded] = useState<string>("");
  const [decoded, setDecoded] = useState<string>("");

  useEffect(() => {
    try {
      const parsed = new URL(url);
      setProtocol(parsed.protocol);
      setHost(parsed.host);
      setPath(parsed.pathname);
      setHash(parsed.hash);

      let pString = "";
      parsed.searchParams.forEach((value, key) => {
        pString += `${key}: ${value}\n`;
      });
      setParams(pString);

      setEncoded(encodeURIComponent(url));
      try {
        setDecoded(decodeURIComponent(url));
      } catch (e) {
        setDecoded("Invalid URL encoding");
      }
    } catch (e) {
      setProtocol("");
      setHost("");
      setPath("");
      setHash("");
      setParams("");

      // Still try to encode/decode as raw string if it's not a valid full URL
      setEncoded(encodeURIComponent(url));
      try {
        setDecoded(decodeURIComponent(url));
      } catch (err) {
        setDecoded("");
      }
    }
  }, [url]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Encoded URL" content={encoded} />
          <Action.CopyToClipboard title="Copy Decoded URL" content={decoded} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="url"
        title="Input URL or String"
        value={url}
        onChange={setUrl}
      />
      <Form.Separator />
      {host && (
        <Form.Description
          title="Protocol & Host"
          text={`${protocol}//${host}`}
        />
      )}
      {path && <Form.Description title="Path" text={path} />}
      {hash && <Form.Description title="Hash" text={hash} />}
      {params && (
        <Form.TextArea
          id="params"
          title="Query Parameters"
          value={params}
          onChange={() => {}}
        />
      )}

      <Form.Separator />
      <Form.TextArea
        id="encoded"
        title="URL Encoded"
        value={encoded}
        onChange={setEncoded}
      />
      <Form.TextArea
        id="decoded"
        title="URL Decoded"
        value={decoded}
        onChange={setDecoded}
      />
    </Form>
  );
}
