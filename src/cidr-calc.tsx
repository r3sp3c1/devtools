import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import ip from "ip";

export default function Command() {
  const [input, setInput] = useState("");

  let result = null;
  let error = "";
  let strictWarning = false;
  let ipPart = "";
  let maskPart = "";

  try {
    const text = input.trim();
    if (text) {
      if (!text.includes("/")) {
        ipPart = text;
        maskPart = "32";
        result = ip.cidrSubnet(text + "/32");
      } else {
        [ipPart, maskPart] = text.split("/");
        result = ip.cidrSubnet(text);
        if (result.networkAddress !== ipPart) {
          strictWarning = true;
        }
      }
    }
  } catch (e: any) {
    error = e.message;
  }

  if (!result) {
    return (
      <List
        filtering={false}
        onSearchTextChange={setInput}
        searchBarPlaceholder="Enter CIDR (e.g. 10.0.0.0/22)..."
      >
        <List.EmptyView
          title={error ? "Invalid CIDR Format" : "Awaiting CIDR..."}
          description={error}
        />
      </List>
    );
  }

  return (
    <List
      filtering={false}
      onSearchTextChange={setInput}
      searchBarPlaceholder="Enter CIDR (e.g. 10.0.0.0/22)..."
    >
      {strictWarning && (
        <List.Item
          id="warning"
          title="⚠️ STRICT CIDR WARNING"
          subtitle={`Host bits are not zero! Did you mean ${result.networkAddress}/${maskPart}?`}
          accessories={[{ text: "INVALID BASE IP" }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                content={`${result.networkAddress}/${maskPart}`}
                title="Copy Correct CIDR"
              />
            </ActionPanel>
          }
        />
      )}
      <List.Item
        id="network"
        title="Network Address"
        subtitle={result.networkAddress}
        accessories={[{ text: "NETWORK" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result.networkAddress} />
          </ActionPanel>
        }
      />
      <List.Item
        id="mask"
        title="Subnet Mask"
        subtitle={result.subnetMask}
        accessories={[{ text: "MASK" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result.subnetMask} />
          </ActionPanel>
        }
      />
      <List.Item
        id="first"
        title="First Usable IP"
        subtitle={result.firstAddress}
        accessories={[{ text: "FIRST" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result.firstAddress} />
          </ActionPanel>
        }
      />
      <List.Item
        id="last"
        title="Last Usable IP"
        subtitle={result.lastAddress}
        accessories={[{ text: "LAST" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result.lastAddress} />
          </ActionPanel>
        }
      />
      <List.Item
        id="broadcast"
        title="Broadcast Address"
        subtitle={result.broadcastAddress}
        accessories={[{ text: "BROADCAST" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result.broadcastAddress} />
          </ActionPanel>
        }
      />
      <List.Item
        id="hosts"
        title="Usable Hosts"
        subtitle={result.numHosts.toString()}
        accessories={[{ text: "HOSTS" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result.numHosts.toString()} />
          </ActionPanel>
        }
      />
      <List.Item
        id="total"
        title="Total IPs"
        subtitle={result.length.toString()}
        accessories={[{ text: "TOTAL" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={result.length.toString()} />
          </ActionPanel>
        }
      />
    </List>
  );
}
