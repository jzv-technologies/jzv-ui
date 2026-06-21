import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim();
    env[key] = val;
  }
});

const supabaseUrl = env["VITE_SUPABASE_URL"];
const supabaseKey = env["VITE_SUPABASE_PUBLISHABLE_KEY"];
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkComplaintConfig() {
  try {
    const { data, error } = await supabase
      .from("dynamic_form_configs")
      .select("*")
      .eq("uuid", "complaint")
      .single();
    
    if (error) {
      console.error("Error fetching config:", error.code, error.message);
    } else {
      console.log("Complaint form configuration in database:");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("Exception:", e.message);
  }
}

checkComplaintConfig();
