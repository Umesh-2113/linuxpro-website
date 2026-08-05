import { OrderInvoicePanel } from "@/components/client/OrderInvoicePanel";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function InvoicePage({ params }: Props) {
  const { orderId } = await params;
  return <OrderInvoicePanel orderId={decodeURIComponent(orderId)} />;
}
