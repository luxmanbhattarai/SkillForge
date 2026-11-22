import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const { orgId, orgRole } = await auth();
  if (!orgId) redirect("/select-org");
  if (orgRole !== "org:admin") redirect("/unauthorized");
  return <main>Organization admin area</main>;
}
