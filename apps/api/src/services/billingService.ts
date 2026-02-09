import { prisma } from "../lib/prisma";

const DEMO_EMAIL = "demo@example.com";

async function getDemoUserId(): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  return user?.id ?? "";
}

/** Get invoice by id or invoiceNumber (Phase 3 tool). */
export async function getInvoiceById(invoiceIdOrNumber: string, userId?: string) {
  const uid = userId ?? (await getDemoUserId());
  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [{ id: invoiceIdOrNumber }, { invoiceNumber: invoiceIdOrNumber }],
      userId: uid,
    },
  });
  if (!invoice) return null;
  return {
    invoiceNumber: invoice.invoiceNumber,
    amount: String(invoice.amount),
    status: invoice.status,
    dueDate: invoice.dueDate?.toISOString(),
    paidAt: invoice.paidAt?.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
  };
}

/** Check refund status by refundId or refundNumber (Phase 3 tool). */
export async function getRefundStatus(refundIdOrNumber: string, userId?: string) {
  const uid = userId ?? (await getDemoUserId());
  const refund = await prisma.refund.findFirst({
    where: { OR: [{ id: refundIdOrNumber }, { refundNumber: refundIdOrNumber }] },
    include: { invoice: true, order: true },
  });
  if (!refund) return null;
  const owns = refund.invoice?.userId === uid || refund.order?.userId === uid;
  if (!owns) return null;
  return {
    refundNumber: refund.refundNumber,
    amount: String(refund.amount),
    status: refund.status,
    reason: refund.reason,
    requestedAt: refund.requestedAt.toISOString(),
    processedAt: refund.processedAt?.toISOString(),
  };
}
