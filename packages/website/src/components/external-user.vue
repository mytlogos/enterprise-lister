<template>
  <div ref="root" class="external">
    <h1 id="external-user">ExternalUser</h1>
    <i class="btn fa-plus fa btn-primary btn-success" aria-hidden="true" @click="data.add.show = true" />
    <table class="table" aria-describedby="external-user">
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Host</th>
          <th class="action" scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in filteredData" :key="index">
          <td>
            {{ item.identifier }}
          </td>
          <td>
            <a v-if="item.host" target="_blank" rel="noopener noreferrer" :href="item.host.link">
              {{ item.host.name }}
            </a>
          </td>
          <td class="d-flex">
            <template v-if="item.identifier">
              <i class="btn delete fas fa-times btn-danger" aria-hidden="true" @click="markDeleteItem(item)" />
              <i class="refresh fas fa-sync-alt btn btn-secondary" aria-hidden="true" @click="refreshItem(item)" />
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <add-external-modal :error="data.add.error" :options="data.hosts" :show="data.add.show" />
    <confirm-modal
      :error="data.confirm.error"
      :show="data.confirm.show"
      :text="data.confirm.text"
      @yes="deleteItem()"
    />
  </div>
</template>

<script lang="ts" setup>
import addExternalModal from "./modal/add-external-modal.vue";
import confirmModal from "./modal/confirm-modal.vue";
import { useExternalUserStore } from "../store/externaluser";
import { computed, reactive } from "vue";
import { EmptyObject, ExternalUser } from "../siteTypes";

interface ExternalListHost {
  link: string;
  value: number;
  name: string;
}

interface ExternalUserItem extends ExternalUser {
  host: ExternalListHost;
}

interface Data {
  add: {
    show: boolean;
    error: string;
  };
  confirm: {
    show: boolean;
    error: string;
    text: string;
  };
  markDelete: string | null;
  hosts: Array<{
    name: string;
    link: string;
    value: number;
  }>;
}

// STORES
const externalUserStore = useExternalUserStore();

// DATA

const data = reactive<Data>({
  add: {
    show: false,
    error: "",
  },
  confirm: {
    show: false,
    error: "",
    text: "",
  },
  markDelete: null,
  hosts: [
    // TODO get options from server
    {
      name: "Novelupdates",
      link: "https://www.novelupdates.com/",
      value: 0,
    },
  ],
});

// COMPUTED
const filteredData = computed(() => {
  return useExternalUserStore()
    .externalUser.filter((value) => value)
    .map((value): ExternalUserItem => {
      const host = data.hosts.find((hostValue) => hostValue.value === value.type);
      if (!host) {
        // FIXME: do not throw error, display error and filter this out
        throw Error("no host for external user: " + JSON.stringify(value));
      }
      return { ...value, host };
    });
});

// FUNCTIONS
function markDeleteItem(item: ExternalUserItem | EmptyObject): void {
  data.markDelete = item.uuid;
  data.confirm.text =
    "Are you sure you want to delete" + item.identifier + "\nof " + item.host.name + " from this site?";
  // item.show = true;
  // TODO fix this modal? issue
}
function deleteItem(): void {
  if (!data.markDelete) {
    return;
  }
  externalUserStore.deleteExternalUser(data.markDelete);
}

function refreshItem(item: ExternalUser | EmptyObject): void {
  // TODO: implement this
}
</script>

<style scoped>
.external {
  height: 400px;
  padding: 5px;
}

table {
  margin-top: 5px;
}

th.action {
  width: 80px;
}
</style>
