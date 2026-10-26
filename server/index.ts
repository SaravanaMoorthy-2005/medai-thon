import { createApp } from "./app";
const { app, engine } = await createApp();
const timer = setInterval(() => engine.tick(), 200);
app.addHook("onClose", async () => {
  clearInterval(timer);
});
await app.listen({ port: Number(process.env.PORT || 3001), host: "127.0.0.1" });
console.log(
  "HYGIENE OS API · http://127.0.0.1:3001 · SQLite persistent · SIMULATED",
);
