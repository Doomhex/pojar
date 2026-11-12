
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey)
    : null;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabase) {
    return res.status(500).json({ error: "Server configuration missing" });
  }

  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing device token" });
    }

    const token = authorization.slice(7).trim();

    if (token.length < 32 || token.length > 256) {
      return res.status(401).json({ error: "Invalid device token" });
    }

    const { device_code, gpio_pin, signal_value } = req.body ?? {};

    if (
      typeof device_code !== "string" ||
      !/^\d{6}$/.test(device_code) ||
      !Number.isInteger(gpio_pin) ||
      gpio_pin < 0 ||
      gpio_pin > 48 ||
      ![0, 1].includes(signal_value)
    ) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id")
      .eq("device_code", device_code)
      .eq("device_token_hash", tokenHash)
      .maybeSingle();

    if (deviceError) {
      console.error("Device lookup failed:", deviceError.message);
      return res.status(500).json({ error: "Device lookup failed" });
    }

    if (!device) {
      return res.status(401).json({ error: "Device authentication failed" });
    }

    const now = new Date().toISOString();

    const { error: eventError } = await supabase
      .from("device_events")
      .insert({
        device_id: device.id,
        gpio_pin,
        signal_value,
        event_type: "gpio",
        created_at: now,
      });

    if (eventError) {
      console.error("Event insert failed:", eventError.message);
      return res.status(500).json({ error: "Could not save event" });
    }

    const { error: updateError } = await supabase
      .from("devices")
      .update({
        status: "online",
        last_seen: now,
        updated_at: now,
      })
      .eq("id", device.id);

    if (updateError) {
      console.error("Device update failed:", updateError.message);
      return res.status(500).json({ error: "Could not update device" });
    }

    return res.status(200).json({
      success: true,
      message: "GPIO event received",
      device_code,
      gpio_pin,
      signal_value,
      received_at: now,
    });
  } catch (error) {
    console.error("Unexpected API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
