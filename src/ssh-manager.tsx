import {
  List,
  ActionPanel,
  Action,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  Form,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import React from "react";

interface Preferences {
  sshTerminal: string;
}

interface Server {
  id: string;
  name: string;
  host: string;
  user: string;
  port: string;
  keyPath?: string;
}

interface SSHKey {
  hash: string;
  path: string;
  type: string;
}

interface ServerValues {
  name: string;
  host: string;
  user: string;
  port: string;
  keyPath: string;
}

function ServerForm({
  server,
  keys,
  onSave,
}: {
  server?: Server;
  keys: SSHKey[];
  onSave: (s: Server) => void;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Server"
            onSubmit={(values: ServerValues) => {
              if (!values.name || !values.host || !values.user) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Missing fields",
                });
                return;
              }
              onSave({
                id: server?.id || Date.now().toString(),
                name: values.name,
                host: values.host,
                user: values.user,
                port: values.port,
                keyPath: values.keyPath,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Display Name"
        defaultValue={server?.name || ""}
        placeholder="Prod Web Server"
      />
      <Form.TextField
        id="host"
        title="Hostname / IP"
        defaultValue={server?.host || ""}
        placeholder="10.0.0.5"
      />
      <Form.TextField
        id="user"
        title="SSH User"
        defaultValue={server?.user || "root"}
        placeholder="root"
      />
      <Form.TextField
        id="port"
        title="SSH Port"
        defaultValue={server?.port || "22"}
        placeholder="22"
      />
      <Form.Dropdown
        id="keyPath"
        title="Identity File (Key)"
        defaultValue={server?.keyPath || "default"}
      >
        <Form.Dropdown.Item
          value="default"
          title="Default (ssh-agent automatically negotiates)"
        />
        {keys.map((k) => (
          <Form.Dropdown.Item
            key={k.path}
            value={k.path}
            title={`${k.path.split("/").pop()} (${k.type})`}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function AddKeyForm({ onAdded }: { onAdded: () => void }) {
  const { pop } = useNavigation();
  const [keyPath, setKeyPath] = useState("~/.ssh/id_ed25519");
  const [useKeychain, setUseKeychain] = useState(false);
  const prefs = getPreferenceValues<Preferences>();

  const loadKey = () => {
    // STRICT RULE: We only load the key into the LOCAL ssh-agent.
    // We open the terminal to run ssh-add so the user can securely type the passphrase.

    let baseCmd = "ssh-add";
    if (useKeychain) {
      // Use macOS specific flag to store passphrase in keychain (--apple-use-keychain for Monterey+, -K for older)
      baseCmd = "ssh-add --apple-use-keychain 2>/dev/null || ssh-add -K";
    }

    const cmd = `${baseCmd} ${keyPath}`;
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
      if (err)
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to open terminal",
        });
      else {
        showToast({
          style: Toast.Style.Success,
          title: "Terminal opened to load key",
        });
        setTimeout(onAdded, 3000); // refresh keys after a few seconds
        pop();
      }
    });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Load Key into Agent" onAction={loadKey} />
        </ActionPanel>
      }
    >
      <Form.Description text="This will open your terminal so you can securely type your passphrase (if required). No keys are copied remotely!" />
      <Form.TextField
        id="path"
        title="Private Key Path"
        value={keyPath}
        onChange={setKeyPath}
      />
      <Form.Checkbox
        id="keychain"
        title="macOS Keychain"
        label="Save Passphrase in Keychain (--apple-use-keychain)"
        value={useKeychain}
        onChange={setUseKeychain}
      />
    </Form>
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [servers, setServers] = useState<Server[]>([]);
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();

  const fetchData = async () => {
    setLoading(true);
    // Fetch Servers
    const stored = await LocalStorage.getItem<string>("ssh-manager-servers");
    if (stored) {
      try {
        setServers(JSON.parse(stored));
      } catch (e) {}
    }

    // Fetch Loaded Keys
    try {
      let sock = "";
      try {
        sock = require("child_process").execSync("launchctl getenv SSH_AUTH_SOCK", { encoding: "utf8" }).trim();
      } catch (e) {
         // ignore
      }

      const env: Record<string, string> = { 
        ...(process.env as Record<string, string>), 
        PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/sbin:/sbin:/usr/bin:/bin" 
      };
      if (sock) env.SSH_AUTH_SOCK = sock;

      const cmd = "ssh-add -L";
      exec(cmd, { env }, (err, stdout, stderr) => {
        if (
          err ||
          stdout.includes("The agent has no identities") ||
          stdout.includes("error fetching identities") ||
          stdout.includes("Could not open a connection")
        ) {
          setKeys([]);
          setLoading(false);
          return;
        }

        const lines = stdout.trim().split("\n");
        const parsedKeys = lines.map((line, idx) => {
          const parts = line.split(" ");
          return {
            type: (parts[0] || "Key").split('-').pop()?.toUpperCase() || "KEY",
            hash: parts.length > 1 ? parts[1].substring(0, 25) + "..." : `hash-${idx}`,
            path: parts.length > 2 ? parts.slice(2).join(" ") : "Loaded Key",
          };
        }).filter(k => k.hash.length > 0 && !k.hash.startsWith("hash-"));
        setKeys(parsedKeys);
        setLoading(false);
      });
    } catch (e: any) {
      setKeys([{ type: "CRASH", hash: "crash", path: `Fatal error: ${e.message}` }]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveServers = async (newServers: Server[]) => {
    setServers(newServers);
    await LocalStorage.setItem(
      "ssh-manager-servers",
      JSON.stringify(newServers),
    );
  };

  const unloadKey = (k: SSHKey) => {
    // If it's not a file path, we might not be able to unload it directly via -d
    const cmd = `zsh -c 'source ~/.zshrc >/dev/null 2>&1; ssh-add -d "${k.path}"'`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Unload Key",
          message: err.message.includes("No such file") ? "Cannot unload key by comment (GPG agent keys or Smartcards cannot be unloaded via ssh-add -d)" : err.message,
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Key Unloaded",
          message: k.path,
        });
        fetchData();
      }
    });
  };

  const unloadAllKeys = () => {
    const cmd = `zsh -c 'source ~/.zshrc >/dev/null 2>&1; ssh-add -D'`;
    exec(cmd, (err) => {
      if (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Unload All Keys",
          message: err.message,
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "All Keys Unloaded",
        });
        fetchData();
      }
    });
  };

  const connect = (s: Server) => {
    // STRICT SSH RULE: Agent Forwarding (-A) is used here!
    let cmd = `ssh -A -p ${s.port || "22"}`;
    if (s.keyPath && s.keyPath !== "default") {
      cmd += ` -i ${s.keyPath}`;
    }
    cmd += ` ${s.user}@${s.host}`;

    let appleScript = "";
    if (prefs.sshTerminal === "iTerm") {
      appleScript = `
        tell application "iTerm"
          activate
          if (count of windows) = 0 then
            create window with default profile
          else
            tell current window
              create tab with default profile
            end tell
          end if
          tell current session of current window
            write text "${cmd}"
          end tell
        end tell
      `;
    } else {
      appleScript = `
        tell application "Terminal"
          activate
          do script "${cmd}"
        end tell
      `;
    }

    exec(`osascript -e '${appleScript}'`, (err) => {
      if (err)
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to connect",
          message: err.message,
        });
    });
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search servers or loaded keys..."
    >
      <List.Section title="Loaded SSH Keys (ssh-agent)">
        {keys.length === 0 && (
          <List.Item
            title="No keys loaded in ssh-agent"
            icon={Icon.Warning}
            actions={
              <ActionPanel>
                <Action
                  title="Load New Key"
                  icon={Icon.Key}
                  onAction={() => push(<AddKeyForm onAdded={fetchData} />)}
                />
                <Action
                  title="Refresh Key List"
                  icon={Icon.ArrowClockwise}
                  onAction={fetchData}
                />
              </ActionPanel>
            }
          />
        )}
        {keys.map((k) => (
          <List.Item
            key={k.hash}
            icon={Icon.Key}
            title={k.path}
            subtitle={`${k.type} • ${k.hash.substring(0, 20)}...`}
            actions={
              <ActionPanel>
                <Action
                  title="Load New Key"
                  icon={Icon.Plus}
                  onAction={() => push(<AddKeyForm onAdded={fetchData} />)}
                />
                <Action
                  title="Unload Key"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => unloadKey(k)}
                />
                <Action
                  title="Unload All Keys"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={unloadAllKeys}
                />
                <Action
                  title="Refresh Key List"
                  icon={Icon.ArrowClockwise}
                  onAction={fetchData}
                />
                <Action.CopyToClipboard
                  title="Copy Key Hash"
                  content={k.hash}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Saved SSH Servers">
        {servers.map((s) => (
          <List.Item
            key={s.id}
            icon={Icon.Terminal}
            title={s.name}
            subtitle={`${s.user}@${s.host}:${s.port}`}
            actions={
              <ActionPanel>
                <Action
                  title="Connect (Open Terminal)"
                  icon={Icon.ArrowRight}
                  onAction={() => connect(s)}
                />
                <Action
                  title="Add Server"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(
                      <ServerForm
                        keys={keys}
                        onSave={(n) => saveServers([...servers, n])}
                      />,
                    )
                  }
                />
                <Action
                  title="Edit Server"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(
                      <ServerForm
                        keys={keys}
                        server={s}
                        onSave={(updated) =>
                          saveServers(
                            servers.map((x) =>
                              x.id === updated.id ? updated : x,
                            ),
                          )
                        }
                      />,
                    )
                  }
                />
                <Action
                  title="Remove Server"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() =>
                    saveServers(servers.filter((x) => x.id !== s.id))
                  }
                />
              </ActionPanel>
            }
          />
        ))}
        {servers.length === 0 && (
          <List.Item
            title="No servers saved"
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action
                  title="Add Server"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(
                      <ServerForm
                        keys={keys}
                        onSave={(n) => saveServers([...servers, n])}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
