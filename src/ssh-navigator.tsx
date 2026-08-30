import {
  List,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import os from "os";
import path from "path";
import SSHConfig from "ssh-config";
import { exec } from "child_process";
import React from "react";

interface Preferences {
  sshTerminal: string;
}

interface Host {
  host: string;
  hostname: string;
  user?: string;
  port?: string;
  identityFile?: string;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStr, setErrorStr] = useState<string>("");

  useEffect(() => {
    try {
      const configPath = path.join(os.homedir(), ".ssh", "config");
      if (!fs.existsSync(configPath)) {
        setErrorStr("No ~/.ssh/config file found.");
        setLoading(false);
        return;
      }

      const content = fs.readFileSync(configPath, "utf8");
      const parsed = SSHConfig.parse(content);

      const parsedHosts: Host[] = [];

      for (const section of parsed) {
        if (section.type === 1 && section.param.toLowerCase() === "host") {
          // 1 = Record
          // Ignore wildcards
          if (section.value === "*") continue;

          const h: Host = {
            host: section.value as string,
            hostname: section.value as string,
          };

          // @ts-ignore - ssh-config types are sometimes weird with nested config
          const config = section.config || [];

          for (const line of config) {
            if (line.param.toLowerCase() === "hostname")
              h.hostname = line.value as string;
            if (line.param.toLowerCase() === "user")
              h.user = line.value as string;
            if (line.param.toLowerCase() === "port")
              h.port = line.value as string;
            if (line.param.toLowerCase() === "identityfile")
              h.identityFile = line.value as string;
          }
          parsedHosts.push(h);
        }
      }

      setHosts(parsedHosts.sort((a, b) => a.host.localeCompare(b.host)));
      setLoading(false);
    } catch (e: any) {
      setErrorStr(e.message);
      setLoading(false);
    }
  }, []);

  const connect = (host: Host) => {
    // STRICT SSH RULE: We ONLY launch the terminal. We NEVER touch or copy keys.
    const cmd = `ssh ${host.host}`;

    let appleScript = "";
    if (prefs.sshTerminal === "iTerm") {
      appleScript = `
        tell application "iTerm"
          create window with default profile
          tell current session of current window
            write text "${cmd}"
          end tell
          activate
        end tell
      `;
    } else {
      appleScript = `
        tell application "Terminal"
          do script "${cmd}"
          activate
        end tell
      `;
    }

    exec(`osascript -e '${appleScript}'`, (err) => {
      if (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to open terminal",
          message: err.message,
        });
      }
    });
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search SSH hosts from ~/.ssh/config..."
    >
      {errorStr && (
        <List.EmptyView
          icon={Icon.Warning}
          title="Error reading SSH Config"
          description={errorStr}
        />
      )}

      {hosts.map((h) => (
        <List.Item
          key={h.host}
          icon={Icon.Terminal}
          title={h.host}
          subtitle={h.hostname !== h.host ? h.hostname : ""}
          accessories={[
            { text: h.user ? `${h.user}@` : "" },
            { text: h.port ? `Port: ${h.port}` : "" },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Connect (Open Terminal)"
                icon={Icon.Terminal}
                onAction={() => connect(h)}
              />
              <Action.CopyToClipboard title="Copy Host" content={h.host} />
              <Action.CopyToClipboard
                title="Copy Hostname"
                content={h.hostname}
              />
              {h.identityFile && (
                <Action.CopyToClipboard
                  title="Copy IdentityFile Path"
                  content={h.identityFile}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
