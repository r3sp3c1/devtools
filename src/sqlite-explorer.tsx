import {
  List,
  ActionPanel,
  Action,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";

export default function Command() {
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        if (
          items.length > 0 &&
          (items[0].path.endsWith(".sqlite") ||
            items[0].path.endsWith(".db") ||
            items[0].path.endsWith(".sqlite3"))
        ) {
          setDbPath(items[0].path);
          exec(
            `sqlite3 -json "${items[0].path}" "SELECT name FROM sqlite_master WHERE type='table';"`,
            (err, stdout) => {
              if (!err && stdout) {
                try {
                  const parsed = JSON.parse(stdout);
                  setTables(parsed.map((t: any) => t.name));
                } catch (e) {}
              }
            },
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!dbPath) return;
    // Default to showing tables if query is empty
    const sql =
      query.trim() ||
      "SELECT name as Table_Name, sql as Schema FROM sqlite_master WHERE type='table';";

    setIsLoading(true);
    exec(
      `sqlite3 -json "${dbPath}" "${sql}"`,
      { timeout: 2000 },
      (err, stdout, stderr) => {
        setIsLoading(false);
        if (err) {
          // format error
          setError((stderr || err.message).split("\n")[0]);
          setResults([]);
        } else {
          setError("");
          try {
            const parsed = JSON.parse(stdout || "[]");
            setResults(Array.isArray(parsed) ? parsed : [parsed]);
          } catch (e) {
            setError("Failed to parse output");
          }
        }
      },
    );
  }, [dbPath, query]);

  if (!dbPath) {
    return (
      <List>
        <List.EmptyView
          icon="📂"
          title="No Database Selected"
          description="Please select a .sqlite or .db file in Finder first!"
        />
      </List>
    );
  }

  const fileName = dbPath.split("/").pop();
  const placeholder = `Query ${fileName} (e.g. SELECT * FROM ${tables[0] || "users"} LIMIT 10)`;

  return (
    <List
      filtering={false}
      onSearchTextChange={setQuery}
      isLoading={isLoading}
      isShowingDetail={results.length > 0}
      searchBarPlaceholder={placeholder}
    >
      {error ? (
        <List.EmptyView icon="⚠️" title="SQL Error" description={error} />
      ) : results.length === 0 ? (
        <List.EmptyView
          icon="📭"
          title="No Results"
          description="Query executed successfully but returned 0 rows."
        />
      ) : (
        results.map((row, idx) => {
          const keys = Object.keys(row);
          const title =
            keys.length > 0 ? `${keys[0]}: ${row[keys[0]]}` : `Row ${idx + 1}`;
          const md = "```json\n" + JSON.stringify(row, null, 2) + "\n```";
          return (
            <List.Item
              key={idx}
              title={title}
              detail={<List.Item.Detail markdown={md} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content={JSON.stringify(row, null, 2)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
