import type { Store } from "vuex"
import { VuexStore } from "./siteTypes";

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $store: Store<VuexStore>;
  }
}