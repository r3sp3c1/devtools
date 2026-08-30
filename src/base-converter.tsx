import { List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [input, setInput] = useState("");

  let num = BigInt(0);
  try {
    const clean = input.trim().replace(/[,._\s]/g, "");
    if (clean) {
      if (
        /^[0-9a-fA-F]+$/.test(clean) &&
        !/^\d+$/.test(clean) &&
        !clean.startsWith("0x")
      ) {
        num = BigInt("0x" + clean);
      } else {
        num = BigInt(clean);
      }
    }
  } catch (e) {}

  const dec = num.toString(10);
  const hex = "0x" + num.toString(16);
  const bin = "0b" + num.toString(2);
  const oct = "0o" + num.toString(8);

  return (
    <List
      filtering={false}
      onSearchTextChange={setInput}
      searchBarPlaceholder="Enter number (e.g. 255, 0xff, 0b10)..."
    >
      <List.Item
        id="dec"
        title="Decimal"
        subtitle={dec}
        accessories={[{ text: "DEC" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={dec} />
          </ActionPanel>
        }
      />
      <List.Item
        id="hex"
        title="Hexadecimal"
        subtitle={hex}
        accessories={[{ text: "HEX" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={hex} />
          </ActionPanel>
        }
      />
      <List.Item
        id="bin"
        title="Binary"
        subtitle={bin}
        accessories={[{ text: "BIN" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={bin} />
          </ActionPanel>
        }
      />
      <List.Item
        id="oct"
        title="Octal"
        subtitle={oct}
        accessories={[{ text: "OCT" }]}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={oct} />
          </ActionPanel>
        }
      />
    </List>
  );
}
