<template>
  <div class="settings">
    <div class="settings-list left-content p-2">
      <label class="input-group">
        <input v-model="filter" type="text" class="form-control" />
      </label>
      <list-comp :data="lists" :filter="filter" :focused="listFocused" :multi="false" />
    </div>
    <div class="page">
      <external-user v-if="show === 0" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { onBusEvent } from "../bus";
import listComp from "../components/list-comp.vue";
import externalUser from "../components/external-user.vue";
import { ClickListener } from "../siteTypes";

interface Data {
  lists: Array<{ name: string; id: number; show: boolean }>;
  filter: string;
  listFocused: boolean;
  show: null | number;
  clickListener: null | ClickListener;
}

export default defineComponent({
  name: "SettingsPage",
  components: {
    listComp,
    externalUser,
  },
  props: {
    showSettings: { type: Boolean, required: true },
  },
  data(): Data {
    return {
      lists: [
        // TODO get options from server
        { name: "External", id: 0, show: false },
      ],
      filter: "",
      listFocused: false,
      show: null,
      clickListener: null,
    };
  },
  mounted(): void {
    this.clickListener = (evt) => {
      const list = document.querySelector(".settings-list .list");

      if (!list) {
        console.warn("Could not find expected list element");
        return;
      }
      this.listFocused = list.contains(evt.target as Node);
    };
    document.addEventListener("click", this.clickListener, { capture: true });
    onBusEvent("select:list", (id) => this.selectList(id));
  },
  unmounted() {
    if (this.clickListener) {
      document.removeEventListener("click", this.clickListener, { capture: true });
    }
  },
  methods: {
    selectList(id: number): void {
      if (!this.listFocused) {
        return;
      }

      for (const list of this.lists) {
        list.show = list.id === id && !list.show;

        if (list.show) {
          this.show = list.id;
        }
      }
    },
  },
});
</script>

<style scoped>
.settings {
  display: flex;
}

.settings > .page {
  flex: 80%;
}

.settings > .settings-list {
  flex: 20%;
}
</style>
