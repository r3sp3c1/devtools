import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useRef } from "react";
import { spawn } from "child_process";

export default function Command() {
  const [host, setHost] = useState("");
  const [protocol, setProtocol] = useCachedState("traceroute-protocol", "UDP");
  const [port, setPort] = useCachedState("traceroute-port", "443");
  const [maxHops, setMaxHops] = useCachedState("traceroute-hops", "15");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const processRef = useRef<any>(null);

  const runTraceroute = async () => {
    const target = host.trim();
    if (!target) {
      showToast({ style: Toast.Style.Failure, title: "Host cannot be empty" });
      return;
    }

    const hops = parseInt(maxHops) || 15;
    const p = parseInt(port) || 443;

    if (processRef.current) {
      processRef.current.kill();
    }

    setIsLoading(true);
    setOutput(
      `Starting ${protocol} Traceroute to ${target} (Max ${hops} hops)...\n(Root not required, Raycast stays open!)\n\n`,
    );

    const args = ["-q", "1", "-w", "1", "-m", hops.toString()];
    if (protocol === "TCP") {
      args.push("-P", "TCP", "-p", p.toString());
    } else if (protocol === "ICMP") {
      args.push("-I");
    }
    args.push(target);

    const child = spawn("traceroute", args);
    processRef.current = child;

    child.stdout.on("data", (data) => {
      setOutput((prev) => prev + data.toString());
    });

    child.stderr.on("data", (data) => {
      setOutput((prev) => prev + data.toString());
    });

    child.on("close", (code) => {
      setIsLoading(false);
      setOutput((prev) => prev + `\n\n[Process completed with code ${code}]`);
      processRef.current = null;
    });

    child.on("error", (err) => {
      setIsLoading(false);
      setOutput((prev) => prev + `\n\n[Error: ${err.message}]`);
      processRef.current = null;
    });
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Run Live Traceroute" onAction={runTraceroute} />
          {output && (
            <Action.CopyToClipboard title="Copy Output" content={output} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="host"
        title="Target Host / IP"
        placeholder="google.com"
        value={host}
        onChange={setHost}
      />

      <Form.Dropdown
        id="protocol"
        title="Protocol"
        value={protocol}
        onChange={setProtocol}
      >
        <Form.Dropdown.Item value="UDP" title="UDP (Standard)" />
        <Form.Dropdown.Item value="TCP" title="TCP (Bypass Firewalls)" />
        <Form.Dropdown.Item value="ICMP" title="ICMP (Ping-style)" />
      </Form.Dropdown>

      {protocol === "TCP" && (
        <Form.TextField
          id="port"
          title="TCP Port"
          placeholder="443"
          value={port}
          onChange={setPort}
        />
      )}

      <Form.TextField
        id="hops"
        title="Max Hops"
        placeholder="15"
        value={maxHops}
        onChange={setMaxHops}
      />

      <Form.Separator />

      <Form.TextArea
        id="output"
        title="Live Routing Table"
        value={output}
        onChange={() => {}}
      />
    </Form>
  );
}
