// QA access for testing the admin in a browser without passwords: ensures the test user
// qa@booking-platform.test (owner of the demo tenants, no password) and prints a one-time login link.
// Usage: node --env-file=.env.local scripts/qa-login-link.mjs [base-url]   (default http://localhost:3000)
// Staging only — never run against production.
import { createClient } from "@supabase/supabase-js";

const base = process.argv[2] ?? "http://localhost:3000";
const email = "qa@booking-platform.test";
const tenants = ["a0000000-0000-4000-8000-000000000001", "a0000000-0000-4000-8000-000000000002"];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: { persistSession: false },
  },
);

const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
let user = list.users.find((u) => u.email === email);
if (!user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: "QA tester" },
  });
  if (error) throw error;
  user = data.user;
}
for (const tenant_id of tenants) {
  const { error } = await supabase
    .from("memberships")
    .upsert({ tenant_id, user_id: user.id, role: "owner" }, { onConflict: "tenant_id,user_id" });
  if (error) throw error;
}
const { data: link, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
if (error) throw error;
console.log(
  `${base}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/admin`,
);
