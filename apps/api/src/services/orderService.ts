import { prisma } from "../lib/prisma";

const DEMO_EMAIL = "demo@example.com";

async function getDemoUserId(): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  return user?.id ?? "";
}

/** Fetch order by id or orderNumber for agent tools (Phase 3). */
export async function getOrderById(orderIdOrNumber: string, userId?: string) {
  const uid = userId ?? (await getDemoUserId());
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
      userId: uid,
    },
    include: { delivery: true },
  });
  if (!order) return null;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: String(order.totalAmount),
    items: order.items,
    createdAt: order.createdAt.toISOString(),
    delivery: order.delivery
      ? {
          carrier: order.delivery.carrier,
          trackingNumber: order.delivery.trackingNumber,
          status: order.delivery.status,
          estimatedDelivery: order.delivery.estimatedDelivery?.toISOString(),
          deliveredAt: order.delivery.deliveredAt?.toISOString(),
        }
      : null,
  };
}

/** Check delivery status for an order (Phase 3 tool). */
export async function getDeliveryStatus(orderIdOrNumber: string, userId?: string) {
  const order = await getOrderById(orderIdOrNumber, userId);
  if (!order?.delivery) return order ? { orderNumber: order.orderNumber, status: order.status, delivery: null } : null;
  return {
    orderNumber: order.orderNumber,
    delivery: order.delivery,
  };
}
