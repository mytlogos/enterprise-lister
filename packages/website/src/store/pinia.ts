import { createPinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";
import { PiniaLogger } from "pinia-logger";

const pinia = createPinia();
pinia.use(createPersistedState());
pinia.use(
  PiniaLogger({
    expanded: false,
    disabled: process.env.mode === "production",
  }),
);

export { pinia };
