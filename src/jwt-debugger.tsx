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
      const { jwtDecode } = require("jwt-decode");
      setOutput(JSON.stringify(jwtDecode(input), null, 2));
      showToast({ style: Toast.Style.Success, title: "Decoded successfully" });
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Invalid JWT" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decode JWT" onSubmit={format} />
          <Action.CopyToClipboard title="Copy Result" content={output} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="JWT Token"
        value={input}
        onChange={setInput}
      />
      <Form.Separator />
      <Form.TextArea
        id="output"
        title="Decoded Payload"
        value={output}
        onChange={setOutput}
      />
    </Form>
  );
}
