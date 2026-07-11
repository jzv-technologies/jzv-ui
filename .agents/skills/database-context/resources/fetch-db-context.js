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

async function fetchDatabaseContext() {
  try {
    console.log("Calling supabase.rpc('get_database_context')...");
    const { data, error } = await supabase.rpc("get_database_context");

    if (error) {
      console.error("RPC call failed:", error);
      return;
    }

    // Save to db_context.json
    const outputPath = path.resolve(process.cwd(), "db-schema.json");
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`Database context saved to ${outputPath}`);
    console.log(`Total size: ${JSON.stringify(data).length} bytes`);
    
    // Print table names for quick reference
    if (data?.schema) {
      console.log("\nTables found:");
      data.schema.forEach(t => console.log(`  - ${t.table}`));
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

fetchDatabaseContext();
