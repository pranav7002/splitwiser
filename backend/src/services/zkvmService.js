export const runZkVm = async (input) => {
  const serviceUrl = process.env.ZKVM_SERVICE_URL;

  if (!serviceUrl) {
    throw new Error("ZKVM_SERVICE_URL is not configured");
  }

  const timeoutMs = Number(process.env.ZKVM_TIMEOUT_MS || 300000);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${serviceUrl}/prove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`zkVM service returned ${response.status}: ${text}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error(
        `zkVM output is not valid JSON: ${err.message}. Raw: ${text.slice(0, 2000)}`
      );
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("zkVM output must be a JSON object");
    }

    if (!Array.isArray(parsed.settlements)) {
      throw new Error("zkVM output must include a settlements array");
    }

    if (typeof parsed.proof !== "string" || !parsed.proof.startsWith("0x")) {
      throw new Error("zkVM output must include a hex proof string");
    }

    return parsed;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`zkVM request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};