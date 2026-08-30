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
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useEffect, useRef } from "react";
import { exec, spawn } from "child_process";

type Server = {
  id: string;
  name: string;
  user: string;
  host: string;
  port: string;
};

// --- HELPER: Execute Docker Command ---
const runDockerCmd = (server: Server | null, cmd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    let fullCmd = "";
    if (!server) {
      // Local
      fullCmd = `/usr/local/bin/docker ${cmd}`; // best effort path, or just docker
    } else {
      // Remote via SSH (relies on SSH agent)
      fullCmd = `ssh -o BatchMode=yes -o ConnectTimeout=5 -p ${server.port} ${server.user}@${server.host} "docker ${cmd}"`;
    }

    const sock = require("child_process")
      .execSync("zsh -c 'source ~/.zshrc && printenv SSH_AUTH_SOCK'")
      .toString()
      .trim();
    const env = { ...process.env, SSH_AUTH_SOCK: sock };

    exec(fullCmd, { env, timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        // Fallback for local docker if not in /usr/local/bin
        if (!server && err.message.includes("No such file")) {
          exec(
            `docker ${cmd}`,
            { timeout: 15000 },
            (err2, stdout2, stderr2) => {
              if (err2) reject(new Error(stderr2 || err2.message));
              else resolve(stdout2);
            },
          );
          return;
        }
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout);
      }
    });
  });
};

// --- VIEW: Add Server ---
function AddServerView({ onAdd }: { onAdd: (s: Server) => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [user, setUser] = useState(process.env.USER || "root");
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
        placeholder="Prod Server"
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
        placeholder="192.168.1.10"
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
      <Form.Description text="Authentication uses your local SSH Agent automatically." />
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
      <Form.Description text="Authentication uses your local SSH Agent automatically." />
    </Form>
  );
}

// --- VIEW: Live Logs ---
function ContainerLogsView({
  server,
  containerId,
  containerName,
}: {
  server: Server | null;
  containerId: string;
  containerName: string;
}) {
  const [logs, setLogs] = useState("Connecting and fetching logs...\n");
  const processRef = useRef<any>(null);

  useEffect(() => {
    let args: string[] = [];
    let cmd = "";
    if (!server) {
      cmd = "docker";
      args = ["logs", "--tail", "100", "-f", containerId];
    } else {
      cmd = "ssh";
      args = [
        "-p",
        server.port,
        `${server.user}@${server.host}`,
        `docker logs --tail 100 -f ${containerId}`,
      ];
    }

    const sock = require("child_process")
      .execSync("zsh -c 'source ~/.zshrc && printenv SSH_AUTH_SOCK'")
      .toString()
      .trim();
    const env = { ...process.env, SSH_AUTH_SOCK: sock };
    const child = spawn(cmd, args, { env });
    processRef.current = child;

    child.stdout.on("data", (d) => setLogs((prev) => prev + d.toString()));
    child.stderr.on("data", (d) => setLogs((prev) => prev + d.toString()));

    return () => {
      if (processRef.current) processRef.current.kill();
    };
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Logs" content={logs} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="logs"
        title={`Logs: ${containerName}`}
        value={logs}
        onChange={() => {}}
      />
    </Form>
  );
}

// --- VIEW: Server Dashboard (Containers & Images) ---
function ServerDashboardView({ server }: { server: Server | null }) {
  const [viewMode, setViewMode] = useState<"containers" | "images" | "stats">(
    "containers",
  );
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (viewMode === "containers") {
        const out = await runDockerCmd(server, `ps -a --format '{{json .}}'`);
        const parsed = out
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l));
        setItems(parsed);
      } else if (viewMode === "images") {
        const out = await runDockerCmd(server, `images --format '{{json .}}'`);
        const parsed = out
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l));
        setItems(parsed);
      } else if (viewMode === "stats") {
        const out = await runDockerCmd(
          server,
          `stats --no-stream --format '{{json .}}'`,
        );
        const parsed = out
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l));
        setItems(parsed);
      }
    } catch (e: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Docker Error",
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
    destructive = false,
  ) => {
    if (destructive) {
      if (
        !(await confirmAlert({
          title: `Are you sure you want to ${action} ${id}?`,
        }))
      )
        return;
    }
    showToast({ style: Toast.Style.Animated, title: `Executing ${action}...` });
    try {
      await runDockerCmd(server, `${action} ${id}`);
      showToast({ style: Toast.Style.Success, title: "Success" });
      fetchData();
    } catch (e: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: e.message,
      });
    }
  };

  const openRemoteShell = (containerId: string) => {
    let cmd = "";
    if (!server) {
      cmd = `docker exec -it ${containerId} sh`;
    } else {
      cmd = `ssh -t -p ${server.port} ${server.user}@${server.host} docker exec -it ${containerId} sh`;
    }

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

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          value={viewMode}
          onChange={(v) => setViewMode(v as any)}
        >
          <List.Dropdown.Item title="Containers" value="containers" />
          <List.Dropdown.Item title="Images" value="images" />
          <List.Dropdown.Item title="Live Top (Stats)" value="stats" />
        </List.Dropdown>
      }
    >
      {viewMode === "containers" &&
        items.map((c, i) => {
          const isRunning = c.State === "running" || c.Status.startsWith("Up");
          return (
            <List.Item
              key={i}
              title={c.Names}
              subtitle={c.Image}
              accessories={[
                { text: c.Status },
                { icon: isRunning ? Icon.CheckCircle : Icon.Stop },
              ]}
              actions={
                <ActionPanel>
                  {isRunning && (
                    <Action
                      title="Drop into Remote Shell"
                      icon={Icon.Terminal}
                      onAction={() => openRemoteShell(c.ID)}
                    />
                  )}
                  {isRunning ? (
                    <Action
                      title="Stop Container"
                      icon={Icon.Stop}
                      onAction={() => handleAction("stop", c.ID)}
                    />
                  ) : (
                    <Action
                      title="Start Container"
                      icon={Icon.Play}
                      onAction={() => handleAction("start", c.ID)}
                    />
                  )}
                  <Action
                    title="Restart Container"
                    icon={Icon.RotateAntiClockwise}
                    onAction={() => handleAction("restart", c.ID)}
                  />
                  <Action.Push
                    title="View Live Logs"
                    icon={Icon.Document}
                    target={
                      <ContainerLogsView
                        server={server}
                        containerId={c.ID}
                        containerName={c.Names}
                      />
                    }
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Delete Container"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleAction("rm -f", c.ID, true)}
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

      {viewMode === "images" &&
        items.map((img, i) => (
          <List.Item
            key={i}
            title={img.Repository}
            subtitle={img.Tag}
            accessories={[{ text: img.Size }, { text: img.ID }]}
            actions={
              <ActionPanel>
                <Action
                  title="Delete Image"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleAction("rmi -f", img.ID, true)}
                />
                <Action
                  title="Refresh"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={fetchData}
                />
              </ActionPanel>
            }
          />
        ))}

      {viewMode === "stats" &&
        items.map((s, i) => (
          <List.Item
            key={i}
            title={s.Name}
            subtitle={`CPU: ${s.CPUPerc} | RAM: ${s.MemUsage} (${s.MemPerc})`}
            accessories={[
              { text: `NET: ${s.NetIO}` },
              { icon: Icon.LevelMeter },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh Stats"
                  icon={Icon.RotateAntiClockwise}
                  onAction={fetchData}
                />
                <Action
                  title="Drop into Remote Shell"
                  icon={Icon.Terminal}
                  onAction={() => openRemoteShell(s.ID || s.Container)}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

// --- MAIN ENTRY: Server List ---
export default function Command() {
  const [servers, setServers] = useCachedState<Server[]>("docker-servers", []);

  return (
    <List searchBarPlaceholder="Select Docker Server...">
      <List.Section title="Local">
        <List.Item
          title="Localhost Docker"
          icon={Icon.Desktop}
          actions={
            <ActionPanel>
              <Action.Push
                title="Connect"
                target={<ServerDashboardView server={null} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Remote Servers">
        {servers.map((s) => (
          <List.Item
            key={s.id}
            title={s.name}
            subtitle={`${s.user}@${s.host}:${s.port}`}
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Connect"
                  target={<ServerDashboardView server={s} />}
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
          title="Add Remote Docker Server..."
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
