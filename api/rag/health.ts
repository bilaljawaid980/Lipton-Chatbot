import { getRagHealth } from "./_engine";

export default async function handler(_request: any, response: any) {
  try {
    const payload = await getRagHealth();
    response.status(200).json(payload);
  } catch (error) {
    console.error("health error", error);
    response.status(500).json({ ok: false, error: "Failed to load RAG health" });
  }
}
