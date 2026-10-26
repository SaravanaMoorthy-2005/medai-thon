import { Store } from "./store";
const store = new Store();
const state = store.load();
console.log(
  `SQLite ready: ${state.beds.length} beds, ${state.devices.length} devices; existing evidence preserved.`,
);
store.close();
