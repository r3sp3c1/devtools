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
      const yaml = require("yaml");
      if (input.trim().startsWith("{") || input.trim().startsWith("[")) {
        setOutput(yaml.stringify(JSON.parse(input)));
      } else {
        setOutput(JSON.stringify(yaml.parse(input), null, 2));
      }
      showToast({
        style: Toast.Style.Success,
        title: "Converted successfully",
      });
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Invalid Input" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={format} />
          <Action.CopyToClipboard title="Copy Result" content={output} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input (JSON/YAML)"
        value={input}
        onChange={setInput}
      />
      <Form.Separator />
      <Form.TextArea
        id="output"
        title="Output"
        value={output}
        onChange={setOutput}
      />
    </Form>
  );
}
