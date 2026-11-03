import { redirect } from "next/navigation";

// The SMS tools moved to /dashboard/sms. Keep old bookmarks and links working.
export default async function LegacySendSmsPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const { memberId } = await searchParams;
  redirect(memberId ? `/dashboard/sms/send?memberId=${encodeURIComponent(memberId)}` : "/dashboard/sms");
}
