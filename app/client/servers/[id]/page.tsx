import { ClientServerManagePanel } from "@/components/client/ClientServerManagePanel";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ServerManagePage({ params }: Props) {
  const { id } = await params;
  return <ClientServerManagePanel serverId={id} />;
}
