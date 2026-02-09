import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // User for demos and scoping conversations/orders
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
    },
  });

  // Seed conversations and messages (req. 6)
  const existingConv1 = await prisma.conversation.findUnique({ where: { id: "conv-seed-1" } });
  if (!existingConv1) {
    await prisma.conversation.create({
      data: {
        id: "conv-seed-1",
        userId: user.id,
        messages: {
          create: [
            { role: "user", content: "How do I reset my password?" },
            { role: "assistant", content: "You can reset it from the login page using 'Forgot password'." },
            { role: "user", content: "Where is my order #ORD-001?" },
            { role: "assistant", content: "Order ORD-001 has been shipped. Tracking: TRK-001." },
          ],
        },
      },
    });
  }

  const existingConv2 = await prisma.conversation.findUnique({ where: { id: "conv-seed-2" } });
  if (!existingConv2) {
    await prisma.conversation.create({
      data: {
        id: "conv-seed-2",
        userId: user.id,
        messages: {
          create: [
            { role: "user", content: "I need help with a refund." },
            { role: "assistant", content: "I can look up your refund status. Do you have a refund or invoice number?" },
          ],
        },
      },
    });
  }

  // Seed orders (req. 6)
  const order1 = await prisma.order.upsert({
    where: { orderNumber: "ORD-001" },
    update: {},
    create: {
      orderNumber: "ORD-001",
      userId: user.id,
      status: "shipped",
      totalAmount: 99.99,
      items: JSON.stringify([{ name: "Widget A", qty: 2, price: 49.99 }]),
    },
  });

  const order2 = await prisma.order.upsert({
    where: { orderNumber: "ORD-002" },
    update: {},
    create: {
      orderNumber: "ORD-002",
      userId: user.id,
      status: "delivered",
      totalAmount: 149.5,
      items: JSON.stringify([{ name: "Widget B", qty: 1, price: 149.5 }]),
    },
  });

  const order3 = await prisma.order.upsert({
    where: { orderNumber: "ORD-003" },
    update: {},
    create: {
      orderNumber: "ORD-003",
      userId: user.id,
      status: "pending",
      totalAmount: 29.99,
      items: JSON.stringify([{ name: "Widget C", qty: 1, price: 29.99 }]),
    },
  });

  // Seed deliveries for orders
  await prisma.delivery.upsert({
    where: { orderId: order1.id },
    update: {},
    create: {
      orderId: order1.id,
      carrier: "FastShip",
      trackingNumber: "TRK-001",
      status: "in_transit",
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.delivery.upsert({
    where: { orderId: order2.id },
    update: {},
    create: {
      orderId: order2.id,
      carrier: "FastShip",
      trackingNumber: "TRK-002",
      status: "delivered",
      deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Seed invoices / payments (req. 6)
  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-001" },
    update: {},
    create: {
      invoiceNumber: "INV-001",
      orderId: order1.id,
      userId: user.id,
      amount: 99.99,
      status: "paid",
      paidAt: new Date(),
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-002" },
    update: {},
    create: {
      invoiceNumber: "INV-002",
      orderId: order2.id,
      userId: user.id,
      amount: 149.5,
      status: "paid",
      paidAt: new Date(),
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-003" },
    update: {},
    create: {
      invoiceNumber: "INV-003",
      orderId: order3.id,
      userId: user.id,
      amount: 29.99,
      status: "pending",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Seed refunds
  await prisma.refund.upsert({
    where: { refundNumber: "REF-001" },
    update: {},
    create: {
      refundNumber: "REF-001",
      invoiceId: inv1.id,
      orderId: order1.id,
      amount: 49.99,
      status: "approved",
      reason: "Partial refund for damaged item",
      processedAt: new Date(),
    },
  });

  await prisma.refund.upsert({
    where: { refundNumber: "REF-002" },
    update: {},
    create: {
      refundNumber: "REF-002",
      orderId: order2.id,
      amount: 149.5,
      status: "pending",
      reason: "Customer request",
    },
  });

  console.log("Seed complete: user, conversations/messages, orders, deliveries, invoices, refunds.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
