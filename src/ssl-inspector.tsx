import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import tls from "tls";
import React from "react";

export default function Command() {
  const [domain, setDomain] = useState<string>("google.com");
  const [port, setPort] = useState<string>("443");
  const [info, setInfo] = useState<string>("");
  const [certRaw, setCertRaw] = useState<string>("");

  const checkSSL = () => {
    if (!domain) return;
    setInfo("Fetching...");
    setCertRaw("");

    const options = {
      host: domain,
      port: parseInt(port) || 443,
      rejectUnauthorized: false, // get it even if invalid
      servername: domain,
    };

    const socket = tls.connect(options, () => {
      const cert = socket.getPeerCertificate(true);
      if (!cert || Object.keys(cert).length === 0) {
        setInfo("No certificate found");
        socket.end();
        return;
      }

      const validFrom = new Date(cert.valid_from).toLocaleString();
      const validTo = new Date(cert.valid_to).toLocaleString();
      const issuer = cert.issuer ? cert.issuer.O || cert.issuer.CN : "Unknown";
      const subject = cert.subject ? cert.subject.CN : "Unknown";
      const daysRemaining = Math.floor(
        (new Date(cert.valid_to).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );

      let infoStr = "Subject: " + subject + "\n";
      infoStr += "Issuer: " + issuer + "\n";
      infoStr += "Valid From: " + validFrom + "\n";
      infoStr += "Valid To: " + validTo + "\n";
      infoStr += "Days Remaining: " + daysRemaining + " days\n";
      if (daysRemaining < 30) {
        infoStr += "WARNING: CERTIFICATE EXPIRES SOON!\n";
      }
      infoStr += "Fingerprint: " + cert.fingerprint + "\n";

      setInfo(infoStr);

      // We don't have the raw PEM easily in Node's tls without an extra library or specific socket options.
      // But we can construct a basic representation or instruct user on how to download it natively.
      setCertRaw(
        "To download full PEM, use:\necho | openssl s_client -servername " +
          domain +
          " -connect " +
          domain +
          ":" +
          port +
          " 2>/dev/null | openssl x509 -outform PEM",
      );
      socket.end();
    });

    socket.on("error", (err) => {
      setInfo("Error: " + err.message);
    });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Check Certificate" onAction={checkSSL} />
          <Action.CopyToClipboard title="Copy Info" content={info} />
          <Action.CopyToClipboard
            title="Copy Download Command"
            content={certRaw}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        value={domain}
        onChange={setDomain}
        placeholder="example.com"
      />
      <Form.TextField
        id="port"
        title="Port"
        value={port}
        onChange={setPort}
        placeholder="443"
      />
      <Form.Separator />
      <Form.TextArea
        id="info"
        title="Certificate Info"
        value={info}
        onChange={setInfo}
      />
      <Form.TextArea
        id="raw"
        title="Download PEM"
        value={certRaw}
        onChange={setCertRaw}
      />
    </Form>
  );
}
