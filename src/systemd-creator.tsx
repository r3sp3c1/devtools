import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [name, setName] = useState("my-service");
  const [desc, setDesc] = useState("My awesome script");
  const [type, setType] = useState("simple");
  const [execStart, setExecStart] = useState("/usr/local/bin/script.sh");
  const [user, setUser] = useState("root");
  const [restart, setRestart] = useState("always");
  const [createTimer, setCreateTimer] = useState(false);
  const [cron, setCron] = useState("*-*-* 02:00:00");

  let serviceFile = `[Unit]
Description=${desc}
After=network.target

[Service]
Type=${type}
User=${user}
ExecStart=${execStart}
${type !== "oneshot" ? `Restart=${restart}\nRestartSec=5` : ""}

[Install]
WantedBy=multi-user.target`;

  let timerFile = `[Unit]
Description=Timer for ${name}

[Timer]
OnCalendar=${cron}
Persistent=true

[Install]
WantedBy=timers.target`;

  let commands = `# 1. Create the service file
sudo nano /etc/systemd/system/${name}.service

# 2. Reload systemd
sudo systemctl daemon-reload

# 3. Enable and Start
sudo systemctl enable --now ${name}.service

# 4. Check Status
sudo systemctl status ${name}.service

# 5. View Logs (follow)
sudo journalctl -fu ${name}.service

# 6. Stop and Remove
sudo systemctl stop ${name}.service
sudo systemctl disable ${name}.service
sudo rm /etc/systemd/system/${name}.service
sudo systemctl daemon-reload`;

  if (createTimer && type === "oneshot") {
    commands = `# 1. Create the service file (does not run on boot by itself, timer handles it)
sudo nano /etc/systemd/system/${name}.service

# 2. Create the timer file
sudo nano /etc/systemd/system/${name}.timer

# 3. Reload systemd
sudo systemctl daemon-reload

# 4. Enable and Start the TIMER (not the service directly)
sudo systemctl enable --now ${name}.timer

# 5. Check Timer Status
sudo systemctl status ${name}.timer
sudo systemctl list-timers | grep ${name}

# 6. View Logs of the executed service
sudo journalctl -fu ${name}.service

# 7. Stop and Remove
sudo systemctl stop ${name}.timer
sudo systemctl disable ${name}.timer
sudo rm /etc/systemd/system/${name}.service /etc/systemd/system/${name}.timer
sudo systemctl daemon-reload`;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Service File" content={serviceFile} />
          {createTimer && type === "oneshot" && (
            <Action.CopyToClipboard title="Copy Timer File" content={timerFile} />
          )}
          <Action.CopyToClipboard title="Copy Setup Commands" content={commands} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Service Name" value={name} onChange={setName} />
      <Form.TextField id="desc" title="Description" value={desc} onChange={setDesc} />
      <Form.TextField id="execStart" title="ExecStart (Path to script)" value={execStart} onChange={setExecStart} />
      <Form.TextField id="user" title="Run as User" value={user} onChange={setUser} />
      
      <Form.Dropdown id="type" title="Service Type" value={type} onChange={setType} info="simple = Endless loop/daemon. oneshot = Runs once and exits (e.g. backup).">
        <Form.Dropdown.Item value="simple" title="Daemon (Endless Loop)" icon={Icon.Repeat} />
        <Form.Dropdown.Item value="oneshot" title="One-Off Script (e.g. Backup)" icon={Icon.Play} />
      </Form.Dropdown>
      
      {type === "simple" && (
        <Form.Dropdown id="restart" title="Restart Policy" value={restart} onChange={setRestart}>
          <Form.Dropdown.Item value="always" title="Always" />
          <Form.Dropdown.Item value="on-failure" title="On Failure" />
          <Form.Dropdown.Item value="no" title="No Restart" />
        </Form.Dropdown>
      )}

      {type === "oneshot" && (
        <Form.Checkbox id="timer" label="Create a recurring Timer (Cron replacement)" value={createTimer} onChange={setCreateTimer} />
      )}

      {type === "oneshot" && createTimer && (
        <Form.TextField id="cron" title="OnCalendar Schedule" value={cron} onChange={setCron} info="Format: DayOfWeek Year-Month-Day Hour:Minute:Second (e.g., '*-*-* 02:00:00' for daily at 2AM)" />
      )}

      <Form.Separator />
      
      <Form.TextArea id="outService" title={`${name}.service`} value={serviceFile} />
      {type === "oneshot" && createTimer && (
        <Form.TextArea id="outTimer" title={`${name}.timer`} value={timerFile} />
      )}
      <Form.TextArea id="outCommands" title="CLI Commands" value={commands} />
    </Form>
  );
}
