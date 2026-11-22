import Fastify from "fastify";
import { pathToFileURL } from "node:url";

const orderBody = {
  type: "object",
  required: ["totalMinor", "currency"],
  properties: {
    totalMinor: { type: "integer", minimum: 1 },
    currency: { type: "string", minLength: 3, maxLength: 3 },
  },
} as const;

const orderResponse = {
  type: "object",
  properties: {
    id: { type: "string" },
    totalMinor: { type: "integer" },
    currency: { type: "string" },
    status: { type: "string" },
  },
} as const;

async function ordersRoutes(fastify: Fastify.FastifyInstance) {
  fastify.post<{ Body: { totalMinor: number; currency: string } }>(
    "/",
    { schema: { body: orderBody, response: { 201: orderResponse } } },
    async (request, reply) => {
      const order = { id: "ord_01", ...request.body, status: "created" };
      return reply.code(201).header("Location", `/v1/orders/${order.id}`).send(order);
    },
  );
}

// Build the app without binding a port, so tests can import this
// module and drive the instance with app.inject().
export function build() {
  const fastify = Fastify({ logger: true });

  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const status = error.statusCode ?? 500;
    void reply.code(status).send({
      type: "https://api.example.com/problems/internal-error",
      title: status === 500 ? "Internal server error" : error.message,
      status,
    });
  });

  fastify.register(ordersRoutes, { prefix: "/v1/orders" });
  fastify.get("/health", async () => ({ status: "ok" }));

  return fastify;
}

const start = async () => {
  const fastify = build();
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Listen only when this file is the entrypoint. Importing it from
// a test must not start a server.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void start();
}
