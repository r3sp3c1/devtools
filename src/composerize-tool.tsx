import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import composerize from "composerize";

export default function Command() {
  const [dockerRun, setDockerRun] = useState("docker run -d --name db -p 5432:5432 -v data:/data -e PASS=123 postgres");
  const [composeYaml, setComposeYaml] = useState("");

  useEffect(() => {
    try {
      if (dockerRun.trim() === "") {
        setComposeYaml("");
        return;
      }
      
      // Clean up multi-line inputs if users paste them with backslashes
      let cleaned = dockerRun.replace(/\\\n/g, " ");
      cleaned = cleaned.replace(/\s+/g, " ").trim();
      
      if (!cleaned.startsWith("docker run") && !cleaned.startsWith("docker create")) {
        setComposeYaml("# Command must start with 'docker run' or 'docker create'");
        return;
      }

      const yaml = composerize(cleaned);
      setComposeYaml(yaml);
    } catch (e: any) {
      setComposeYaml(`# Error parsing command:\n# ${e.message}`);
    }
  }, [dockerRun]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy docker-compose.yml" content={composeYaml} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="dockerRun"
        title="Docker Run Command"
        value={dockerRun}
        onChange={setDockerRun}
        placeholder="docker run -d -p 80:80 nginx"
        info="Paste your docker run command here. It will be converted instantly."
      />
      <Form.Separator />
      <Form.TextArea
        id="composeYaml"
        title="docker-compose.yml"
        value={composeYaml}
        onChange={() => {}}
      />
    </Form>
  );
}
