
import { supabase } from "./supabase";

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from("devices")
    .select("id, device_code, name, status")
    .limit(5);

  if (error) {
    console.error("Ошибка Supabase:", error.message);
    return;
  }

  console.log("Supabase подключён успешно!");
  console.log("Устройства:", data);
}
