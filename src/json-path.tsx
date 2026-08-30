import { Form, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { JSONPath } from "jsonpath-plus";

export default function Command() {
  const [jsonInput, setJsonInput] = useState("");
  const [query, setQuery] = useState("$.*");
  const [result, setResult] = useState("");

  useEffect(() => {
    try {
      if (!jsonInput.trim()) {
        setResult("");
        return;
      }
      const parsed = JSON.parse(jsonInput);
      const res = JSONPath({ path: query, json: parsed });
      setResult(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setResult(e.message);
    }
  }, [jsonInput, query]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={result} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="json"
        title="Source JSON"
        placeholder='{"users": [{"name": "John"}]}'
        value={jsonInput}
        onChange={setJsonInput}
      />
      <Form.TextField
        id="query"
        title="JSONPath Query"
        placeholder="$.users[*].name"
        value={query}
        onChange={setQuery}
      />
      <Form.Separator />
      <Form.TextArea
        id="result"
        title="Evaluation Result"
        value={result}
        onChange={() => {}}
      />
    </Form>
  );
}
