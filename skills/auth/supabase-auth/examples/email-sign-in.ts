import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password, // from the sign-in form input — never a hardcoded literal
});
if (error) {
  // Show a generic message; do not reveal whether the email exists.
  throw new Error("Invalid email or password");
}
