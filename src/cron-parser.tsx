import { Form, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import cronstrue from "cronstrue";
import cronParser from "cron-parser";
import React from "react";

export default function Command() {
  const [cronExp, setCronExp] = useState<string>("*/15 * * * *");
  const [readable, setReadable] = useState<string>("");
  const [upcoming, setUpcoming] = useState<string>("");

  useEffect(() => {
    if (!cronExp.trim()) {
      setReadable("");
      setUpcoming("");
      return;
    }

    try {
      const text = cronstrue.toString(cronExp, { use24HourTimeFormat: true });
      setReadable(text);

      const interval = cronParser.parse(cronExp);
      let nextRuns = "Next 5 executions:\n";
      for (let i = 0; i < 5; i++) {
        nextRuns += `- ${interval.next().toString()}\n`;
      }
      setUpcoming(nextRuns);
    } catch (e: any) {
      setReadable(`Error: ${e.message}`);
      setUpcoming("");
    }
  }, [cronExp]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Human Readable"
            content={readable}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="cron"
        title="Cron Expression"
        value={cronExp}
        onChange={setCronExp}
        placeholder="* * * * *"
      />
      <Form.Description
        title="Human Readable"
        text={readable || "Invalid expression"}
      />
      <Form.Separator />
      <Form.TextArea
        id="upcoming"
        title="Upcoming Executions"
        value={upcoming}
        onChange={setUpcoming}
      />
    </Form>
  );
}
