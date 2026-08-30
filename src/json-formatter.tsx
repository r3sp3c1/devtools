import {
  Form,
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const format = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      showToast({
        style: Toast.Style.Success,
        title: "Formatted successfully",
      });
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Invalid JSON" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Format JSON" onSubmit={format} />
          <Action.CopyToClipboard title="Copy Result" content={output} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input JSON"
        value={input}
        onChange={setInput}
      />
      <Form.Separator />
      <Form.TextArea
        id="output"
        title="Output JSON"
        value={output}
        onChange={setOutput}
      />
    </Form>
  );
}
