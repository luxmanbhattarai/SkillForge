import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

const createOrderSchema = z.object({
  totalMinor: z.number().int().positive(),
  currency: z.string().length(3),
});

const orders = express.Router();

orders.post("/", (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      type: "https://api.example.com/problems/validation-error",
      title: "Validation failed",
      status: 400,
      errors: parsed.error.issues,
    });
  }
  const order = { id: "ord_01", ...parsed.data, status: "created" };
  return res
    .status(201)
    .location(`/v1/orders/${order.id}`)
    .json(order);
});

app.use("/v1/orders", orders);
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use((_req, res) => {
  res.status(404).json({
    type: "https://api.example.com/problems/not-found",
    title: "Not found",
    status: 404,
  });
});

// Four arguments: Express only treats this as an error handler
// when all four are present.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    type: "https://api.example.com/problems/internal-error",
    title: "Internal server error",
    status: 500,
  });
});
