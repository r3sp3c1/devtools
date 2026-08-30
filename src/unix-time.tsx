import { List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { format } from "date-fns";

export default function Command() {
  const [input, setInput] = useState("");

  // Fallback to current time if the search bar is cleared
  const val = input.trim() === "" ? Date.now().toString() : input.trim();
  const num = parseInt(val, 10);
  const date = new Date(
    !isNaN(num) ? (num > 9999999999 ? num : num * 1000) : NaN,
  );

  const isValid = !isNaN(date.getTime());

  const custom = isValid
    ? format(date, "dd.MM.yyyy HH:mm:ss")
    : "Invalid Timestamp";
  const iso = isValid ? date.toISOString() : "Invalid Timestamp";
  const local = isValid ? date.toLocaleString() : "Invalid Timestamp";
  const utc = isValid ? date.toUTCString() : "Invalid Timestamp";

  return (
    <List
      filtering={false}
      onSearchTextChange={setInput}
      searchBarPlaceholder="Enter timestamp (s or ms)..."
    >
      <List.Item
        id="custom"
        title="Custom (DE)"
        subtitle={custom}
        accessories={[{ text: "CUSTOM" }]}
        actions={
          isValid ? (
            <ActionPanel>
              <Action.CopyToClipboard content={custom} />
            </ActionPanel>
          ) : undefined
        }
      />
      <List.Item
        id="iso"
        title="ISO 8601"
        subtitle={iso}
        accessories={[{ text: "ISO" }]}
        actions={
          isValid ? (
            <ActionPanel>
              <Action.CopyToClipboard content={iso} />
            </ActionPanel>
          ) : undefined
        }
      />
      <List.Item
        id="local"
        title="Local String"
        subtitle={local}
        accessories={[{ text: "LOCAL" }]}
        actions={
          isValid ? (
            <ActionPanel>
              <Action.CopyToClipboard content={local} />
            </ActionPanel>
          ) : undefined
        }
      />
      <List.Item
        id="utc"
        title="UTC String"
        subtitle={utc}
        accessories={[{ text: "UTC" }]}
        actions={
          isValid ? (
            <ActionPanel>
              <Action.CopyToClipboard content={utc} />
            </ActionPanel>
          ) : undefined
        }
      />
    </List>
  );
}
