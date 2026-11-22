import { app } from "./app.js";

const server = app.listen(process.env.PORT ?? 3000, () => {
  console.log(`listening on ${process.env.PORT ?? 3000}`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
