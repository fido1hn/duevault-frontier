import { GrantDetailClient } from "@/features/audit/components/grant-detail-client";

export const dynamic = "force-dynamic";

type GrantDetailPageProps = {
  params: Promise<{
    grantId: string;
  }>;
};

export default async function GrantDetailPage({
  params,
}: GrantDetailPageProps) {
  const { grantId } = await params;

  return <GrantDetailClient grantId={grantId} />;
}
