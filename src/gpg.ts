import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export interface GpgKey {
  id: string;
  fingerprint: string;
  uids: string[];
  type: string;
  expires?: string;
  created?: string;
}

function runGpg(args: string[], stdinData?: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const customEnv = {
      ...process.env,
      PATH: `${process.env.PATH || ""}:/usr/local/bin:/opt/homebrew/bin`,
      LANG: "C"
    };
    const proc = spawn("gpg", args, { env: customEnv });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      reject(err);
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });

    if (stdinData !== undefined) {
      proc.stdin.write(stdinData);
      proc.stdin.end();
    }
  });
}

export async function listKeys(secret = false): Promise<GpgKey[]> {
  const args = ["--with-colons", secret ? "--list-secret-keys" : "--list-keys"];
  const { stdout } = await runGpg(args);
  
  const expectedType = secret ? "sec" : "pub";
  const lines = stdout.split("\n");
  const keys: GpgKey[] = [];
  let currentKey: GpgKey | null = null;

  for (const line of lines) {
    const parts = line.split(":");
    const type = parts[0];

    if (type === expectedType) {
      if (currentKey) keys.push(currentKey);
      currentKey = {
        type: expectedType,
        id: parts[4],
        created: parts[5],
        expires: parts[6],
        fingerprint: "",
        uids: [],
      };
    } else if (type === "fpr" && currentKey) {
      if (!currentKey.fingerprint) {
        currentKey.fingerprint = parts[9];
      }
    } else if (type === "uid" && currentKey) {
      const uid = parts[9].replace(/\\x3a/g, ":"); // Basic unescape
      currentKey.uids.push(uid);
    }
  }
  if (currentKey) keys.push(currentKey);

  return keys;
}

export async function generateKey(name: string, email: string): Promise<string> {
  const uid = `${name} <${email}>`;
  const { stdout, stderr, code } = await runGpg(["--batch", "--quick-generate-key", uid, "default", "default", "never"]);
  if (code !== 0) throw new Error(stderr);
  return stdout + "\\n" + stderr;
}

export async function encryptText(text: string, recipient?: string, symmetric: boolean = false, filePath?: string): Promise<string> {
  const args = ["--armor", "--batch"];
  if (symmetric) {
    args.push("--symmetric");
  } else {
    args.push("--encrypt");
  }
  if (recipient && !symmetric) {
    args.push("--recipient", recipient, "--trust-model", "always");
  }
  
  if (filePath) {
      args.push("--output", filePath + ".asc", filePath);
      const { code, stderr } = await runGpg(args);
      if (code !== 0) throw new Error(stderr);
      return filePath + ".asc";
  }

  const { stdout, stderr, code } = await runGpg(args, text || undefined);
  if (code !== 0) throw new Error(stderr);
  return stdout;
}

export async function decryptText(text: string, filePath?: string): Promise<string> {
  const args = ["--decrypt", "--batch"];
  if (filePath) {
      const outPath = filePath.replace(/\.(asc|gpg)$/, "");
      args.push("--output", outPath, filePath);
      const { code, stderr } = await runGpg(args);
      if (code !== 0) throw new Error(stderr);
      return outPath;
  }
  const { stdout, stderr, code } = await runGpg(args, text || undefined);
  if (code !== 0) throw new Error(stderr);
  return stdout;
}

export async function signText(text: string, filePath?: string): Promise<string> {
  const args = ["--clear-sign", "--batch"];
  if (filePath) {
      args.push("--output", filePath + ".asc", filePath);
      const { code, stderr } = await runGpg(args);
      if (code !== 0) throw new Error(stderr);
      return filePath + ".asc";
  }
  const { stdout, stderr, code } = await runGpg(args, text || undefined);
  if (code !== 0) throw new Error(stderr);
  return stdout;
}

export async function verifyText(text: string, filePath?: string): Promise<string> {
  const args = ["--verify", "--batch"];
  if (filePath) {
      args.push(filePath);
      const { stdout, stderr, code } = await runGpg(args);
      if (code !== 0) throw new Error(stderr);
      return stdout + "\\n" + stderr;
  }
  const { stdout, stderr, code } = await runGpg(args, text || undefined);
  if (code !== 0) throw new Error(stderr);
  return stdout + "\\n" + stderr;
}

export async function addUid(fingerprint: string, name: string, email: string): Promise<void> {
    const uid = `${name} <${email}>`;
    const { code, stderr } = await runGpg(["--batch", "--quick-add-uid", fingerprint, uid]);
    if (code !== 0) throw new Error(stderr);
}

export async function setPrimaryUid(fingerprint: string, uid: string): Promise<void> {
    const { code, stderr } = await runGpg(["--batch", "--quick-set-primary-uid", fingerprint, uid]);
    if (code !== 0) throw new Error(stderr);
}

export async function deleteKey(fingerprint: string, secret = false): Promise<void> {
    // Attempt to delete secret key first if it exists
    await runGpg(["--batch", "--yes", "--delete-secret-keys", fingerprint]);
    
    // Then delete public key
    const { code, stderr } = await runGpg(["--batch", "--yes", "--delete-keys", fingerprint]);
    if (code !== 0 && !stderr.includes("not found")) {
        throw new Error(stderr);
    }
}

export async function setDefaultKey(fingerprint: string): Promise<void> {
    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs");
    const confPath = path.join(os.homedir(), ".gnupg", "gpg.conf");
    fs.appendFileSync(confPath, `\ndefault-key ${fingerprint}\n`);
}

export async function exportGpgKey(email: string, destDir: string, safeName: string) {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const pubPath = path.join(destDir, `${safeName}-pub.asc`);
    const secPath = path.join(destDir, `${safeName}-sec.asc`);
    await runGpg(["--batch", "--yes", "--armor", "--export", "--output", pubPath, email]);
    await runGpg(["--batch", "--yes", "--armor", "--pinentry-mode", "loopback", "--export-secret-keys", "--output", secPath, email]);
}

export async function signFileDetached(filePath: string): Promise<string> {
  const outPath = filePath + ".sig";
  const args = ["--detach-sign", "--armor", "--batch", "--yes", "--output", outPath, filePath];
  const { code, stderr } = await runGpg(args);
  if (code !== 0) throw new Error(stderr);
  return outPath;
}

export async function verifyFileDetached(filePath: string): Promise<string> {
  // Check if .sig exists
  const sigPath = filePath + ".sig";
  if (!fs.existsSync(sigPath)) {
    throw new Error("Detached signature file (.sig) not found in the same directory.");
  }
  const args = ["--verify", sigPath, filePath];
  const { stderr, code } = await runGpg(args);
  // GPG writes verification results to stderr
  if (code !== 0) throw new Error("Signature verification failed: " + stderr);
  return stderr; // Returns the valid signature message
}
