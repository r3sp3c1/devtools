import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import React from "react";

export default function Command() {
  const [interfaceName, setInterfaceName] = useState<string>("en0");
  const [mac, setMac] = useState<string>("");
  const [output, setOutput] = useState<string>("");

  const generateRandomMac = () => {
    const hexDigits = "0123456789abcdef";
    let randomMac = "";
    for (let i = 0; i < 6; i++) {
      randomMac += hexDigits.charAt(Math.floor(Math.random() * 16));
      randomMac += hexDigits.charAt(Math.floor(Math.random() * 16));
      if (i < 5) randomMac += ":";
    }
    // Ensure unicast and locally administered bit is set properly to avoid network issues
    // First byte should have bit 0 as 0 (unicast) and bit 1 as 1 (locally administered)
    // 02:xx:xx:xx:xx:xx is a safe prefix
    setMac("02:" + randomMac.substring(3));
  };

  const applyMac = (m: string) => {
    if (!interfaceName || !m) return;

    // AppleScript for sudo
    const appleScript = `do shell script "ifconfig ${interfaceName} ether ${m}" with administrator privileges`;
    setOutput(
      `Applying MAC ${m} to ${interfaceName}...\nWaiting for TouchID...`,
    );

    exec(`osascript -e '${appleScript}'`, (error, stdout, stderr) => {
      if (error) {
        setOutput(`Error: ${error.message}`);
        showToast({ style: Toast.Style.Failure, title: "Spoofing Failed" });
      } else {
        setOutput(
          `Success! Interface ${interfaceName} is now operating with MAC Address:\n${m}\n\n(Note: To restore your original physical MAC, simply turn your Wi-Fi off and on again, or reboot your Mac)`,
        );
        showToast({
          style: Toast.Style.Success,
          title: "MAC Address Spoofed!",
        });
      }
    });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Spoof MAC Address (TouchID)"
            onAction={() => applyMac(mac)}
          />
          <Action title="Generate Random MAC" onAction={generateRandomMac} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="interface"
        title="Interface"
        value={interfaceName}
        onChange={setInterfaceName}
        placeholder="en0"
      />
      <Form.TextField
        id="mac"
        title="New MAC Address"
        value={mac}
        onChange={setMac}
        placeholder="02:aa:bb:cc:dd:ee"
      />
      <Form.Separator />
      <Form.TextArea
        id="output"
        title="Status"
        value={output}
        onChange={setOutput}
      />
    </Form>
  );
}
