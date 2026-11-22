// Minimal shapes for this standalone example; a real SDK defines
// these in its generated client types.
interface Order {
  id: string;
}

interface OrdersClient {
  orders: {
    list(params: {
      cursor?: string;
      limit?: number;
    }): Promise<{ data: Order[]; nextCursor?: string }>;
  };
}

export async function* listAllOrders(
  client: OrdersClient,
  params: { limit?: number } = {},
): AsyncGenerator<Order, void, undefined> {
  let cursor: string | undefined;
  do {
    const page = await client.orders.list({ cursor, limit: params.limit });
    yield* page.data;
    cursor = page.nextCursor;
  } while (cursor !== undefined);
}
