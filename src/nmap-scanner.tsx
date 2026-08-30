import {
  Form,
  ActionPanel,
  Action,
  Detail,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import React from "react";

function ScanResult({ target, mode }: { target: string; mode: string }) {
  const [output, setOutput] = useState<string>("Initializing scan...");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const env = {
      ...process.env,
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/sbin:/sbin:/usr/bin:/bin",
    };

    let flags = "";
    if (mode === "fast") flags = "-sT -F";
    if (mode === "full") flags = "-sT -p- -T4";
    if (mode === "ping") flags = "-sn";
    if (mode === "os") flags = "-O -osscan-guess";

    const cmd = `nmap ${flags} ${target}`;

    setOutput(`$ ${cmd}\n\nRunning nmap... This might take a few moments.\n`);

    exec(cmd, { env, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      setIsLoading(false);
      if (error) {
        setOutput(
          `$ ${cmd}\n\n❌ Error running nmap:\n${stderr || error.message}\n\n🔥 SYSADMIN INFO:\nIf you used OS Detection, it requires ROOT privileges on macOS. Standard Connect Scans do not.`,
        );
      } else {
        setOutput(`$ ${cmd}\n\n${stdout}`);
      }
    });
  }, [target, mode]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`\`\`\`shell\n${output}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={output} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Nmap Scan"
            icon={Icon.Play}
            onSubmit={(values) =>
              push(<ScanResult target={values.target} mode={values.mode} />)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="target"
        title="Target IP / Range"
        placeholder="192.168.1.1 or 10.0.0.0/24"
        info="Type your target here. The form will not freeze!"
      />
      <Form.Dropdown id="mode" title="Scan Profile" defaultValue="fast">
        <Form.Dropdown.Item
          value="fast"
          title="Fast Connect Scan (Top 100 Ports, NO ROOT)"
        />
        <Form.Dropdown.Item
          value="full"
          title="Full Connect Scan (All 65k Ports, NO ROOT)"
        />
        <Form.Dropdown.Item
          value="ping"
          title="Ping Sweep (Host Discovery, NO ROOT)"
        />
        <Form.Dropdown.Item
          value="os"
          title="OS Detection (REQUIRES ROOT/SUDO)"
        />
      </Form.Dropdown>
    </Form>
  );
}
