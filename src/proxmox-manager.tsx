import {
  List,
  ActionPanel,
  Action,
  Icon,
  Form,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useEffect } from "react";
import { exec } from "child_process";

type Server = {
  id: string;
  name: string;
  user: string;
  host: string;
  port: string;
};

// --- HELPER: Execute Proxmox Command via SSH ---
const runSSHCmd = (server: Server, cmd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fullCmd = `ssh -o BatchMode=yes -o ConnectTimeout=5 -p ${server.port} ${server.user}@${server.host} "${cmd}"`;
    const sock = require("child_process")
      .execSync("zsh -c 'source ~/.zshrc && printenv SSH_AUTH_SOCK'")
      .toString()
      .trim();
    const env = { ...process.env, SSH_AUTH_SOCK: sock };

    exec(
      fullCmd,
      { env, timeout: 25000, maxBuffer: 1024 * 1024 * 5 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
        } else {
          resolve(stdout);
        }
      },
    );
  });
};

// --- VIEW: Add Server ---
function AddServerView({ onAdd }: { onAdd: (s: Server) => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [user, setUser] = useState("root");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Server"
            onSubmit={() => {
              if (!name || !host) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Name and Host required",
                });
                return;
              }
              onAdd({ id: Date.now().toString(), name, user, host, port });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Display Name"
        placeholder="PVE Node 1"
        value={name}
        onChange={setName}
      />
      <Form.TextField
        id="user"
        title="SSH User"
        placeholder="root"
        value={user}
        onChange={setUser}
      />
      <Form.TextField
        id="host"
        title="SSH Host / IP"
        placeholder="10.0.0.10"
        value={host}
        onChange={setHost}
      />
      <Form.TextField
        id="port"
        title="SSH Port"
        placeholder="22"
        value={port}
        onChange={setPort}
      />
    </Form>
  );
}

// --- VIEW: Edit Server ---
function EditServerView({
  server,
  onSave,
}: {
  server: Server;
  onSave: (s: Server) => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(server.name);
  const [user, setUser] = useState(server.user);
  const [host, setHost] = useState(server.host);
  const [port, setPort] = useState(server.port);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Server"
            onSubmit={() => {
              if (!name || !host) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Name and Host required",
                });
                return;
              }
              onSave({ ...server, name, user, host, port });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Display Name"
        value={name}
        onChange={setName}
      />
      <Form.TextField
        id="user"
        title="SSH User"
        value={user}
        onChange={setUser}
      />
      <Form.TextField
        id="host"
        title="SSH Host / IP"
        value={host}
        onChange={setHost}
      />
      <Form.TextField
        id="port"
        title="SSH Port"
        value={port}
        onChange={setPort}
      />
    </Form>
  );
}

// --- VIEW: Proxmox Dashboard ---
function ProxmoxDashboardView({ server }: { server: Server }) {
  const [viewMode, setViewMode] = useState<"lxc" | "qemu">("lxc");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // pvesh is a built-in Proxmox tool to query the REST API locally over CLI!
      const out = await runSSHCmd(
        server,
        `pvesh get /cluster/resources --output-format json`,
      );
      const parsed = JSON.parse(out);
      const filtered = parsed.filter((r: any) => r.type === viewMode);

      // Sort by VMID
      filtered.sort((a: any, b: any) => a.vmid - b.vmid);

      setItems(filtered);
    } catch (e: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Proxmox Error",
        message: e.message,
      });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode]);

  const handleAction = async (
    action: string,
    id: string,
    name: string,
    targetNode: string,
    destructive = false,
  ) => {
    if (destructive) {
      const confirmed = await confirmAlert({
        title: `CRITICAL DELETION WARNING`,
        message: `You are about to DESTROY the ${viewMode.toUpperCase()} '${name}' (ID: ${id}) on Node '${targetNode}'!\n\nThis will permanently delete the virtual disk and all data! Are you absolutely sure?`,
        primaryAction: {
          title: "löschen",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
    }

    showToast({ style: Toast.Style.Animated, title: `Executing ${action}...` });
    try {
      let cmd = "";
      if (action === "destroy") {
        cmd = `pvesh delete /nodes/${targetNode}/${viewMode}/${id}`;
      } else {
        cmd = `pvesh create /nodes/${targetNode}/${viewMode}/${id}/status/${action}`;
      }
      await runSSHCmd(server, cmd);
      showToast({ style: Toast.Style.Success, title: "Success" });
      setTimeout(fetchData, 1500); // give Proxmox time to update status
    } catch (e: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: e.message,
      });
    }
  };

  const openLXCShell = (vmid: number, targetNode: string) => {
    // Proxmox cluster nodes have passwordless SSH between them.
    // We SSH into the selected server, and from there we SSH into the target node!
    const cmd = `ssh -t -p ${server.port} ${server.user}@${server.host} "ssh -o StrictHostKeyChecking=no root@${targetNode} pct enter ${vmid}"`;
    const useITerm = require("fs").existsSync("/Applications/iTerm.app");
    let script = "";
    if (useITerm) {
      script = `
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
      script = `
        tell application "Terminal"
          activate
          do script "${cmd}"
        end tell
      `;
    }
    exec(`osascript -e '${script}'`);
    showToast({
      style: Toast.Style.Success,
      title: useITerm ? "iTerm2 opened" : "Terminal opened",
    });
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 MB";
    return (bytes / 1024 / 1024).toFixed(0) + " MB";
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          value={viewMode}
          onChange={(v) => setViewMode(v as any)}
        >
          <List.Dropdown.Item title="LXC Containers" value="lxc" />
          <List.Dropdown.Item title="Virtual Machines (QEMU)" value="qemu" />
        </List.Dropdown>
      }
    >
      {items.map((r, i) => {
        const isRunning = r.status === "running";
        const tool = viewMode === "lxc" ? "pct" : "qm";
        const isLxc = viewMode === "lxc";

        let sub = `Node: ${r.node}`;
        if (isRunning && r.mem) {
          sub += ` | RAM: ${formatBytes(r.mem)} / ${formatBytes(r.maxmem)}`;
          if (r.cpu) sub += ` | CPU: ${(r.cpu * 100).toFixed(1)}%`;
        }

        return (
          <List.Item
            key={i}
            title={`${r.vmid} | ${r.name}`}
            subtitle={sub}
            accessories={[
              { text: r.status },
              { icon: isRunning ? Icon.CheckCircle : Icon.Stop },
            ]}
            actions={
              <ActionPanel>
                {isRunning && isLxc && (
                  <Action
                    title="Drop into LXC Shell"
                    icon={Icon.Terminal}
                    onAction={() => openLXCShell(r.vmid, r.node)}
                  />
                )}

                {isRunning ? (
                  <Action
                    title="Stop"
                    icon={Icon.Stop}
                    onAction={() =>
                      handleAction("stop", r.vmid, r.name, r.node)
                    }
                  />
                ) : (
                  <Action
                    title="Start"
                    icon={Icon.Play}
                    onAction={() =>
                      handleAction("start", r.vmid, r.name, r.node)
                    }
                  />
                )}
                <Action
                  title="Reboot"
                  icon={Icon.RotateAntiClockwise}
                  onAction={() =>
                    handleAction("reboot", r.vmid, r.name, r.node)
                  }
                />

                <ActionPanel.Section>
                  <Action
                    title="Destroy (Delete)"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      handleAction("destroy", r.vmid, r.name, r.node, true)
                    }
                  />
                </ActionPanel.Section>
                <Action
                  title="Refresh"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={fetchData}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

// --- MAIN ENTRY ---
export default function Command() {
  const [servers, setServers] = useCachedState<Server[]>("proxmox-servers", []);

  return (
    <List searchBarPlaceholder="Select Proxmox Server...">
      <List.Section title="Remote Servers">
        {servers.map((s) => (
          <List.Item
            key={s.id}
            title={s.name}
            subtitle={`${s.user}@${s.host}:${s.port}`}
            icon={Icon.HardDrive}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Connect"
                  target={<ProxmoxDashboardView server={s} />}
                />
                <Action.Push
                  title="Edit Server"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={
                    <EditServerView
                      server={s}
                      onSave={(updatedServer) => {
                        setServers(
                          servers.map((x) =>
                            x.id === s.id ? updatedServer : x,
                          ),
                        );
                      }}
                    />
                  }
                />
                <Action
                  title="Remove Server"
                  style={Action.Style.Destructive}
                  onAction={() => {
                    setServers(servers.filter((x) => x.id !== s.id));
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Management">
        <List.Item
          title="Add Proxmox Server..."
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add"
                target={
                  <AddServerView onAdd={(s) => setServers([...servers, s])} />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
