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
