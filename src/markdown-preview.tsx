import { Form, ActionPanel, Action, Detail, useNavigation } from "@raycast/api";
import { useState } from "react";
import React from "react";

function Preview({ content }: { content: string }) {
  return (
    <Detail
      markdown={content || "*Nothing to preview*"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Markdown" content={content} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [content, setContent] = useState<string>(
    "# Hello Markdown\n\n* Make it bold\n* Make it fast\n\n```ts\nconsole.log('Raycast is awesome');\n```",
  );
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Preview Rendered Markdown"
            onAction={() => push(<Preview content={content} />)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Raw Markdown"
        value={content}
        onChange={setContent}
        info="Type your markdown here, then press Cmd+Enter to preview it"
      />
    </Form>
  );
}
