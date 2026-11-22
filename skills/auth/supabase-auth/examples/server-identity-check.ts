import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const supabase = await createClient();
// getClaims() verifies the JWT; getSession() would not.
const { data, error } = await supabase.auth.getClaims();
if (error || !data?.claims) redirect("/login");
