import {
  List,
  ActionPanel,
  Action,
  LocalStorage,
  showToast,
  Toast,
  Icon,
  useNavigation,
  Form,
} from "@raycast/api";
import { useState, useEffect } from "react";
// @ts-ignore
import wol from "wake_on_lan";
import React from "react";

interface Node {
  id: string;
  name: string;
  mac: string;
  ip?: string;
}

function NodeForm({
  node,
  onSave,
}: {
  node?: Node;
  onSave: (n: Node) => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(node?.name || "");
  const [mac, setMac] = useState(node?.mac || "");
  const [ip, setIp] = useState(node?.ip || "");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Node"
            onSubmit={() => {
              if (!name || !mac) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Name and MAC are required",
                });
                return;
              }
              onSave({ id: node?.id || Date.now().toString(), name, mac, ip });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Node Name"
        value={name}
        onChange={setName}
        placeholder="Proxmox Node 1"
      />
      <Form.TextField
        id="mac"
        title="MAC Address"
        value={mac}
        onChange={setMac}
        placeholder="00:1A:2B:3C:4D:5E"
      />
      <Form.TextField
        id="ip"
        title="Broadcast IP (Optional)"
        value={ip}
        onChange={setIp}
        placeholder="255.255.255.255"
        info="Leave blank for global broadcast"
      />
    </Form>
  );
}

export default function Command() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    async function init() {
      const stored = await LocalStorage.getItem<string>("wol-nodes");
      if (stored) {
        try {
          setNodes(JSON.parse(stored));
        } catch (e) {}
      }
    }
    init();
  }, []);

  const saveNodes = async (newNodes: Node[]) => {
    setNodes(newNodes);
    await LocalStorage.setItem("wol-nodes", JSON.stringify(newNodes));
  };

  const wake = async (n: Node) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending Magic Packet...",
    });
    const opts = n.ip ? { address: n.ip } : undefined;

    wol.wake(n.mac, opts, (error: any) => {
      if (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to wake";
        toast.message = error.message || "Unknown error";
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Magic Packet Sent!";
        toast.message = "Node " + n.name + " should be waking up.";
      }
    });
  };

  return (
    <List isLoading={false} searchBarPlaceholder="Select a node to wake up...">
      {nodes.length === 0 && (
        <List.EmptyView
          title="No nodes configured"
          description="Click to add a server to wake via LAN"
          icon={Icon.Bolt}
          actions={
            <ActionPanel>
              <Action
                title="Add Node"
                icon={Icon.Plus}
                onAction={() =>
                  push(<NodeForm onSave={(n) => saveNodes([...nodes, n])} />)
                }
              />
            </ActionPanel>
          }
        />
      )}

      {nodes.map((n) => (
        <List.Item
          key={n.id}
          icon={Icon.Bolt}
          title={n.name}
          subtitle={n.mac + (n.ip ? " (" + n.ip + ")" : "")}
          actions={
            <ActionPanel>
              <Action
                title="Wake Up (Send Magic Packet)"
                icon={Icon.Power}
                onAction={() => wake(n)}
              />
              <Action
                title="Add Node"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <NodeForm onSave={(newN) => saveNodes([...nodes, newN])} />,
                  )
                }
              />
              <Action
                title="Edit Node"
                icon={Icon.Pencil}
                onAction={() =>
                  push(
                    <NodeForm
                      node={n}
                      onSave={(updated) =>
                        saveNodes(
                          nodes.map((x) => (x.id === updated.id ? updated : x)),
                        )
                      }
                    />,
                  )
                }
              />
              <Action
                title="Remove Node"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => saveNodes(nodes.filter((x) => x.id !== n.id))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
