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

  const format = async () => {
    try {
      const { format } = require("sql-formatter");
      setOutput(format(input));
      showToast({
        style: Toast.Style.Success,
        title: "Formatted successfully",
      });
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Invalid SQL" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Format SQL" onSubmit={format} />
          <Action.CopyToClipboard title="Copy Result" content={output} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input SQL"
        value={input}
        onChange={setInput}
      />
      <Form.Separator />
      <Form.TextArea
        id="output"
        title="Output SQL"
        value={output}
        onChange={setOutput}
      />
    </Form>
  );
}
