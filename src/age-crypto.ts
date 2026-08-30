import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ENV = { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` };

function runCmd(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { env: ENV }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

export async function generateAgeKey(name: string): Promise<{ publicKey: string, privateKey: string }> {
  const tmpPath = path.join(os.tmpdir(), `age-key-${Date.now()}.txt`);
  await runCmd(`age-keygen -o "${tmpPath}"`);
  const content = fs.readFileSync(tmpPath, 'utf8');
  fs.unlinkSync(tmpPath);
  
  const lines = content.split('\n');
  const pubLine = lines.find(l => l.startsWith('# public key: '));
  const privLine = lines.find(l => l.startsWith('AGE-SECRET-KEY-'));
  
  if (!pubLine || !privLine) throw new Error("Failed to parse age key");
  return { publicKey: pubLine.replace('# public key: ', '').trim(), privateKey: privLine.trim() };
}

export async function encryptAge(text: string, recipient: string): Promise<string> {
  const tmpIn = path.join(os.tmpdir(), `age-in-${Date.now()}.txt`);
  const tmpOut = path.join(os.tmpdir(), `age-out-${Date.now()}.age`);
  fs.writeFileSync(tmpIn, text);
  await runCmd(`age -r "${recipient}" -a -o "${tmpOut}" "${tmpIn}"`);
  const out = fs.readFileSync(tmpOut, 'utf8');
  fs.unlinkSync(tmpIn);
  fs.unlinkSync(tmpOut);
  return out;
}

export async function decryptAge(cipherText: string, privateKeyPath: string): Promise<string> {
  const tmpIn = path.join(os.tmpdir(), `age-in-${Date.now()}.age`);
  fs.writeFileSync(tmpIn, cipherText);
  // use rage for speed if available, otherwise age
  const bin = fs.existsSync("/opt/homebrew/bin/rage") ? "rage" : "age";
  const stdout = await runCmd(`${bin} -d -i "${privateKeyPath}" "${tmpIn}"`);
  fs.unlinkSync(tmpIn);
  return stdout;
}

export async function encryptAgeFile(filePath: string, recipient: string): Promise<string> {
  const outPath = `${filePath}.age`;
  await runCmd(`age -r "${recipient}" -o "${outPath}" "${filePath}"`);
  return outPath;
}

export async function decryptAgeFile(filePath: string, privateKeyPath: string): Promise<string> {
  const outPath = filePath.replace('.age', '');
  const bin = fs.existsSync("/opt/homebrew/bin/rage") ? "rage" : "age";
  await runCmd(`${bin} -d -i "${privateKeyPath}" -o "${outPath}" "${filePath}"`);
  return outPath;
}
