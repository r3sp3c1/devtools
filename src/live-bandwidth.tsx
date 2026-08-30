import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import React from "react";

interface IfaceStat {
  name: string;
  rxBytes: number;
  txBytes: number;
  rxSpeed: number; // bytes/sec
  txSpeed: number; // bytes/sec
}

export default function Command() {
  const [stats, setStats] = useState<IfaceStat[]>([]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  useEffect(() => {
    let lastData: Record<string, { rx: number; tx: number; time: number }> = {};

    const env = {
      ...process.env,
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/sbin:/sbin:/usr/bin:/bin",
    };

    const fetchStats = () => {
      // netstat -ib works on macOS to get byte counters per interface
      exec("netstat -ib", { env }, (err, stdout) => {
        if (err) return;

        const now = Date.now();
        const lines = stdout.split("\n").slice(1);
        const currentData: Record<string, { rx: number; tx: number }> = {};

        lines.forEach((line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 10 && !parts[0].startsWith("Name")) {
            const name = parts[0];
            // Link# entries have the byte counters
            if (
              parts.length >= 7 &&
              (parts[2].startsWith("<Link#") || parts[1].startsWith("<Link#"))
            ) {
              const rx = parseInt(parts[parts.length - 5]) || 0;
              const tx = parseInt(parts[parts.length - 2]) || 0;
              currentData[name] = { rx, tx };
            }
          }
        });

        const newStats: IfaceStat[] = [];

        for (const [name, data] of Object.entries(currentData)) {
          let rxSpeed = 0;
          let txSpeed = 0;

          if (lastData[name]) {
            const timeDiff = (now - lastData[name].time) / 1000;
            if (timeDiff > 0) {
              rxSpeed = Math.max(0, (data.rx - lastData[name].rx) / timeDiff);
              txSpeed = Math.max(0, (data.tx - lastData[name].tx) / timeDiff);
            }
          }

          newStats.push({
            name,
            rxBytes: data.rx,
            txBytes: data.tx,
            rxSpeed,
            txSpeed,
          });

          lastData[name] = { rx: data.rx, tx: data.tx, time: now };
        }

        setStats(
          newStats
            .filter((s) => s.rxBytes > 0 || s.txBytes > 0)
            .sort((a, b) => b.rxSpeed - a.rxSpeed),
        );
      });
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <List isLoading={false} searchBarPlaceholder="Filter interfaces...">
      {stats.map((s) => (
        <List.Item
          key={s.name}
          icon={s.name.startsWith("en") ? Icon.Wifi : Icon.Network}
          title={s.name}
          subtitle={`\u2193 ${formatBytes(s.rxSpeed)}/s  |  \u2191 ${formatBytes(s.txSpeed)}/s`}
          accessories={[
            { text: `Total RX: ${formatBytes(s.rxBytes)}` },
            { text: `Total TX: ${formatBytes(s.txBytes)}` },
          ]}
        />
      ))}
    </List>
  );
}
