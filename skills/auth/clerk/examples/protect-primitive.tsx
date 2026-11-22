import { auth } from "@clerk/nextjs/server";

export default async function BillingPage() {
  const { userId } = await auth.protect();
  // userId is guaranteed present here; unauthenticated users are redirected.
  return <main>Billing for {userId}</main>;
}
