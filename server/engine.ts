import { Engine as BaseEngine } from "../shared/engine";
import { Store } from "./store";

export * from "../shared/engine";

export class Engine extends BaseEngine<Store> {
  constructor(store: Store = new Store()) {
    super(store);
  }
}
