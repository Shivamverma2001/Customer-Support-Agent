import { tool } from "ai";
import { z } from "zod";
import * as chatService from "../services/chatService";
import * as orderService from "../services/orderService";
import * as billingService from "../services/billingService";

export type AgentContext = { conversationId: string; userId?: string };

/** Build tools with conversationId and userId for DB access. */
export function createSupportTools(ctx: AgentContext) {
  return {
    query_conversation_history: tool({
      description:
        "Get the recent messages in this conversation. Use when the user refers to earlier messages or you need context.",
      parameters: z.object({}),
      execute: async () => {
        const text = await chatService.getConversationHistoryForAgent(ctx.conversationId, ctx.userId, 20);
        return text ?? "No conversation found or no messages.";
      },
    }),
  };
}

export function createOrderTools(ctx: AgentContext) {
  return {
    fetch_order_details: tool({
      description: "Get order details by order ID or order number (e.g. ORD-001).",
      parameters: z.object({ orderId: z.string().describe("Order ID or order number") }),
      execute: async ({ orderId }) => {
        const order = await orderService.getOrderById(orderId, ctx.userId);
        if (!order) return "Order not found.";
        return JSON.stringify(order, null, 0);
      },
    }),
    check_delivery_status: tool({
      description: "Check delivery/tracking status for an order by order ID or order number.",
      parameters: z.object({ orderId: z.string().describe("Order ID or order number") }),
      execute: async ({ orderId }) => {
        const status = await orderService.getDeliveryStatus(orderId, ctx.userId);
        if (!status) return "Order or delivery not found.";
        return JSON.stringify(status, null, 0);
      },
    }),
  };
}

export function createBillingTools(ctx: AgentContext) {
  return {
    get_invoice_details: tool({
      description: "Get invoice details by invoice ID or invoice number (e.g. INV-001).",
      parameters: z.object({ invoiceId: z.string().describe("Invoice ID or invoice number") }),
      execute: async ({ invoiceId }) => {
        const inv = await billingService.getInvoiceById(invoiceId, ctx.userId);
        if (!inv) return "Invoice not found.";
        return JSON.stringify(inv, null, 0);
      },
    }),
    check_refund_status: tool({
      description: "Check refund status by refund ID or refund number (e.g. REF-001).",
      parameters: z.object({ refundId: z.string().describe("Refund ID or refund number") }),
      execute: async ({ refundId }) => {
        const ref = await billingService.getRefundStatus(refundId, ctx.userId);
        if (!ref) return "Refund not found.";
        return JSON.stringify(ref, null, 0);
      },
    }),
  };
}
