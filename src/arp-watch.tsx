import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import React from "react";

interface ARPScan {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  isDuplicate: boolean;
}

export default function Command() {
  const [scans, setScans] = useState<ARPScan[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArp = () => {
    setLoading(true);

    // arp -an works natively on macOS to dump the arp cache instantly (disables slow DNS resolution)
    exec("arp -an", (error, stdout, stderr) => {
      setLoading(false);
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to run ARP",
          message: stderr,
        });
        return;
      }

      const lines = stdout.split("\n");
      const results: ARPScan[] = [];
      const macCounts: Record<string, number> = {};
      const ipCounts: Record<string, number> = {};

      lines.forEach((line) => {
        // Example output: ? (192.168.1.1) at 0:1a:2b:3c:4d:5e on en0 ifscope [ethernet]
        const match = line.match(/^(.*?) \((.*?)\) at (.*?) on/);
        if (match) {
          const hostname = match[1] === "?" ? "Unknown" : match[1];
          const ip = match[2];
          const mac = match[3];

          // Ignore incomplete/broadcast
          if (mac !== "(incomplete)" && mac !== "ff:ff:ff:ff:ff:ff") {
            results.push({
              ip,
              mac,
              hostname,
              vendor: "Unknown",
              isDuplicate: false,
            });
            macCounts[mac] = (macCounts[mac] || 0) + 1;
            ipCounts[ip] = (ipCounts[ip] || 0) + 1;
          }
        }
      });

      // Mark duplicates
      results.forEach((r) => {
        if (macCounts[r.mac] > 1 || ipCounts[r.ip] > 1) {
          r.isDuplicate = true;
        }
      });

      setScans(
        results.sort((a, b) =>
          a.ip.localeCompare(b.ip, undefined, { numeric: true }),
        ),
      );
    });
  };

  useEffect(() => {
    fetchArp();
  }, []);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search IP or MAC (e.g. 192.168.1, a1:b2)..."
    >
      <List.Section title="ARP Table (Local Network Cache)">
        {scans.map((s, idx) => (
          <List.Item
            key={idx + s.ip}
            icon={s.isDuplicate ? Icon.ExclamationMark : Icon.Desktop}
            title={s.ip}
            subtitle={s.mac + (s.isDuplicate ? " [DUPLICATE DETECTED]" : "")}
            accessories={[{ text: s.hostname }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy IP" content={s.ip} />
                <Action.CopyToClipboard title="Copy MAC" content={s.mac} />
                <Action
                  title="Refresh ARP Cache"
                  icon={Icon.ArrowClockwise}
                  onAction={fetchArp}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
