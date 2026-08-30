import { List, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [input, setInput] = useState("hello world");

  const camelCase = input
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase(),
    )
    .replace(/\s+/g, "");
  const snakeCase =
    input
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g,
      )
      ?.map((x) => x.toLowerCase())
      .join("_") || "";
  const kebabCase =
    input
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g,
      )
      ?.map((x) => x.toLowerCase())
      .join("-") || "";

  return (
    <List onSearchTextChange={setInput} searchBarPlaceholder="Enter text...">
      <List.Item
        title="camelCase"
        subtitle={camelCase}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={camelCase} />
          </ActionPanel>
        }
      />
      <List.Item
        title="snake_case"
        subtitle={snakeCase}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={snakeCase} />
          </ActionPanel>
        }
      />
      <List.Item
        title="kebab-case"
        subtitle={kebabCase}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={kebabCase} />
          </ActionPanel>
        }
      />
      <List.Item
        title="UPPERCASE"
        subtitle={input.toUpperCase()}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={input.toUpperCase()} />
          </ActionPanel>
        }
      />
      <List.Item
        title="lowercase"
        subtitle={input.toLowerCase()}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={input.toLowerCase()} />
          </ActionPanel>
        }
      />
    </List>
  );
}
