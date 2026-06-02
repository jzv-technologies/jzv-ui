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

async function checkUsers() {
  try {
    // Since we are unauthenticated, we check if we can query user_roles table or admin_users_view.
    // If they have RLS and we see nothing, let's look at the schema or query results.
    console.log("Querying user_roles table directly...");
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("*");
    
    if (rolesError) {
      console.error("user_roles query failed:", rolesError);
    } else {
      console.log(`user_roles contains ${rolesData.length} records:`, rolesData);
    }

    console.log("\nQuerying admin_users_view view...");
    const { data: viewData, error: viewError } = await supabase
      .from("admin_users_view")
      .select("*");
    
    if (viewError) {
      console.error("admin_users_view query failed:", viewError);
    } else {
      console.log(`admin_users_view contains ${viewData.length} records:`, viewData);
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

checkUsers();
