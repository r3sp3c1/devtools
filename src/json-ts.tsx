import { Form, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import JsonToTS from "json-to-ts";
import React from "react";

export default function Command() {
  const [input, setInput] = useState<string>(
    '{\\n  "id": 1,\\n  "name": "Antigravity",\\n  "awesome": true\\n}',
  );
  const [output, setOutput] = useState<string>("");

  useEffect(() => {
    if (!input.trim()) {
      setOutput("");
      return;
    }

    try {
      const obj = JSON.parse(input);
      const interfaces = JsonToTS(obj).join("\n\n");
      setOutput(interfaces);
    } catch (e: any) {
      setOutput(`Invalid JSON: ${e.message}`);
    }
  }, [input]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy TypeScript" content={output} />
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
        title="TypeScript Interfaces"
        value={output}
        onChange={setOutput}
      />
    </Form>
  );
}
