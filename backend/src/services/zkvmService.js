import { spawn } from "child_process";

const readStream = (stream) =>
  new Promise((resolve) => {
    let data = "";
    stream.on("data", (chunk) => {
      data += chunk.toString();
    });
    stream.on("end", () => resolve(data));
  });

export const runZkVm = async (input) => {
  const command = process.env.ZKVM_COMMAND;

  if (!command) {
    throw new Error("ZKVM_COMMAND is not configured");
  }

  const timeoutMs = Number(process.env.ZKVM_TIMEOUT_MS || 300000);

  return new Promise((resolve, reject) => {
    const child = spawn(command, [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
      shell: false,
    });

    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const stdoutPromise = readStream(child.stdout);
    const stderrPromise = readStream(child.stderr);

    child.on("error", async (err) => {
      clearTimeout(timeout);
      const stderr = await stderrPromise;
      reject(
        new Error(
          `Failed to start zkVM process: ${err.message}${stderr ? ` | stderr: ${stderr}` : ""
          }`
        )
      );
    });

    child.on("close", async (code) => {
      clearTimeout(timeout);
      const stdout = await stdoutPromise;
      const stderr = await stderrPromise;

      if (timedOut) {
        reject(new Error(`zkVM execution timed out after ${timeoutMs}ms`));
        return;
      }

      if (code !== 0) {
        reject(
          new Error(
            `zkVM process exited with code ${code}${stderr ? ` | stderr: ${stderr}` : ""
            }`
          )
        );
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch (err) {
        reject(
          new Error(
            `zkVM output is not valid JSON: ${err.message}. Raw output: ${stdout.slice(
              0,
              2000
            )}`
          )
        );
        return;
      }

      if (!parsed || typeof parsed !== "object") {
        reject(new Error("zkVM output must be a JSON object"));
        return;
      }

      if (!Array.isArray(parsed.settlements)) {
        reject(new Error("zkVM output must include a settlements array"));
        return;
      }

      if (typeof parsed.proof !== "string" || !parsed.proof.startsWith("0x")) {
        reject(new Error("zkVM output must include a hex proof string"));
        return;
      }

      resolve(parsed);
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
};