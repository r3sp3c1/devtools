import {
  List,
  ActionPanel,
  Action,
  getSelectedFinderItems,
  LocalStorage,
  showToast,
  Toast,
  Icon,
  useNavigation,
  Form,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import React from "react";

interface Preferences {
  sshTerminal: string;
  defaultScpDownloadPath?: string;
}

interface Server {
  id: string;
  name: string;
  user: string;
  ip: string;
  path: string;
  isDefault: boolean;
}

function DownloadForm({
  server,
  defaultLocalPath,
  onDownload,
}: {
  server: Server;
  defaultLocalPath: string;
  onDownload: (remote: string, local: string) => void;
}) {
  const { pop } = useNavigation();
  const [remotePath, setRemotePath] = useState(server.path || "/tmp/file.txt");
  const [localPath, setLocalPath] = useState(defaultLocalPath);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Download"
            icon={Icon.Download}
            onSubmit={() => {
              if (!remotePath || !localPath) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "All fields are required",
                });
                return;
              }
              onDownload(remotePath, localPath);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="remote"
        title="Remote File/Folder"
        value={remotePath}
        onChange={setRemotePath}
        placeholder="/var/log/syslog"
      />
      <Form.TextField
        id="local"
        title="Local Destination"
        value={localPath}
        onChange={setLocalPath}
        placeholder="~/Downloads"
      />
    </Form>
  );
}

function ServerForm({
  server,
  onSave,
}: {
  server?: Server;
  onSave: (s: Server) => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(server?.name || "");
  const [user, setUser] = useState(server?.user || "");
  const [ip, setIp] = useState(server?.ip || "");
  const [path, setPath] = useState(server?.path || "");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Server"
            onSubmit={() => {
              if (!name || !user || !ip || !path) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "All fields are required",
                });
                return;
              }
              onSave({
                id: server?.id || Date.now().toString(),
                name,
                user,
                ip,
                path,
                isDefault: server?.isDefault || false,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Server Name"
        value={name}
        onChange={setName}
        placeholder="e.g. Production Web"
      />
      <Form.TextField
        id="user"
        title="SSH User"
        value={user}
        onChange={setUser}
        placeholder="root"
      />
      <Form.TextField
        id="ip"
        title="IP Address / Host"
        value={ip}
        onChange={setIp}
        placeholder="192.168.1.100"
      />
      <Form.TextField
        id="path"
        title="Remote Path"
        value={path}
        onChange={setPath}
        placeholder="/var/www/html/"
      />
    </Form>
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [servers, setServers] = useState<Server[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    async function init() {
      const stored = await LocalStorage.getItem<string>("scp-servers");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setServers(
            parsed.sort(
              (a: Server, b: Server) =>
                (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0),
            ),
          );
        } catch (e) {}
      }

      try {
        const items = await getSelectedFinderItems();
        setFiles(items.map((i) => i.path));
      } catch (e) {
        // no files
      }
    }
    init();
  }, []);

  const saveServers = async (newServers: Server[]) => {
    const sorted = [...newServers].sort(
      (a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0),
    );
    setServers(sorted);
    await LocalStorage.setItem("scp-servers", JSON.stringify(sorted));
  };

  const addServer = (s: Server) => {
    if (servers.length === 0) s.isDefault = true;
    saveServers([...servers, s]);
  };

  const updateServer = (updated: Server) => {
    saveServers(servers.map((s) => (s.id === updated.id ? updated : s)));
  };

  const deleteServer = (id: string) => {
    saveServers(servers.filter((s) => s.id !== id));
  };

  const setAsDefault = (id: string) => {
    saveServers(servers.map((s) => ({ ...s, isDefault: s.id === id })));
  };

  const connectSSH = (server: Server) => {
    const cmd = `ssh -A ${server.user}@${server.ip}`;

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
      if (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to connect",
          message: err.message,
        });
      }
    });
  };

  const download = async (server: Server, remotePath: string, localPath: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading...",
    });

    const expandedLocalPath = localPath.replace(/^~/, require("os").homedir());
    const cmd = `scp -r ${server.user}@${server.ip}:"${remotePath}" "${expandedLocalPath}"`;

    let sshAuthSock = "";
    try {
      sshAuthSock = require("child_process")
        .execSync("launchctl getenv SSH_AUTH_SOCK", { encoding: "utf8" })
        .trim();
    } catch (e) {}

    const env = { ...process.env };
    if (sshAuthSock) env.SSH_AUTH_SOCK = sshAuthSock;

    exec(cmd, { env }, (error, stdout, stderr) => {
      if (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Download Failed";
        toast.message = stderr || error.message;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Download Complete";
        toast.message = `Saved to ${localPath}`;
      }
    });
  };

  const transfer = async (server: Server) => {
    if (files.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No files selected in Finder!",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Transferring...",
    });
    const fileArgs = files.map((f) => `"${f}"`).join(" ");

    const cmd = `scp -r ${fileArgs} ${server.user}@${server.ip}:${server.path}`;

    // Robust fetch of SSH_AUTH_SOCK bypassing isolated shell environments
    let sshAuthSock = "";
    try {
      sshAuthSock = require("child_process")
        .execSync("launchctl getenv SSH_AUTH_SOCK", { encoding: "utf8" })
        .trim();
    } catch (e) {
      // ignore
    }

    const env = { ...process.env };
    if (sshAuthSock) {
      env.SSH_AUTH_SOCK = sshAuthSock;
    }

    exec(cmd, { env }, (error, stdout, stderr) => {
      if (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Transfer Failed";
        toast.message = stderr || error.message;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Transfer Complete";
        toast.message = `Successfully transferred ${files.length} item(s) to ${server.name}`;
      }
    });
  };

  return (
    <List
      isLoading={false}
      searchBarPlaceholder="Select a server to transfer files to, or manage servers..."
    >
      {servers.length === 0 && (
        <List.EmptyView
          title="No SCP Servers configured"
          description="Click to add your first server"
          icon={Icon.HardDrive}
          actions={
            <ActionPanel>
              <Action
                title="Add SCP Server"
                icon={Icon.Plus}
                onAction={() => push(<ServerForm onSave={addServer} />)}
              />
            </ActionPanel>
          }
        />
      )}

      {servers.map((s) => (
        <List.Item
          key={s.id}
          icon={s.isDefault ? Icon.Star : Icon.HardDrive}
          title={s.name}
          subtitle={`${s.user}@${s.ip}:${s.path}`}
          accessories={[
            {
              text:
                files.length > 0
                  ? `Ready to send ${files.length} file(s)`
                  : "Manage Server",
            },
          ]}
          actions={
            <ActionPanel>
              {files.length > 0 && (
                <Action
                  title="Upload Files (SCP)"
                  icon={Icon.Upload}
                  onAction={() => transfer(s)}
                />
              )}
              <Action
                title="Download File (SCP)"
                icon={Icon.Download}
                onAction={() =>
                  push(
                    <DownloadForm
                      server={s}
                      defaultLocalPath={prefs.defaultScpDownloadPath || "~/Downloads"}
                      onDownload={(remote, local) => download(s, remote, local)}
                    />
                  )
                }
              />
              <Action
                title="Connect via SSH"
                icon={Icon.Terminal}
                onAction={() => connectSSH(s)}
              />
              <Action
                title="Edit Server"
                icon={Icon.Pencil}
                onAction={() =>
                  push(<ServerForm server={s} onSave={updateServer} />)
                }
              />
              <Action
                title="Add New SCP Server"
                icon={Icon.Plus}
                onAction={() => push(<ServerForm onSave={addServer} />)}
              />
              <Action
                title="Set as Default"
                icon={Icon.Star}
                onAction={() => setAsDefault(s.id)}
              />
              <Action
                title="Remove Server"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteServer(s.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
