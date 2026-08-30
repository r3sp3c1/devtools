import { List, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  const text =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

  return (
    <List searchBarPlaceholder="Lorem Ipsum Generator">
      <List.Item
        title="Standard Paragraph"
        subtitle={text}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={text} />
          </ActionPanel>
        }
      />
    </List>
  );
}
