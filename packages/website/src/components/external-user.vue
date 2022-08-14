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
              <i class="btn delete fas fa-times btn-danger me-2" aria-hidden="true" @click="markDeleteItem(item)" />
              <i class="refresh fas fa-sync-alt btn btn-secondary" aria-hidden="true" @click="refreshItem(item)" />
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <add-external-modal v-model:show="data.add.show" :options="data.hosts" />
  </div>
</template>

<script lang="ts" setup>
import addExternalModal from "./modal/add-external-modal.vue";
import { useExternalUserStore } from "../store/externaluser";
import { computed, reactive } from "vue";
import { EmptyObject, ExternalUser } from "../siteTypes";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

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
  return externalUserStore.externalUser
    .filter((value) => value)
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
const toast = useToast();
const confirm = useConfirm();

function markDeleteItem(item: ExternalUserItem): void {
  confirm.require({
    message: "Are you sure you want to remove" + item.identifier + "\nof " + item.host.name + " from this site?",
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: () => {
      externalUserStore
        .deleteExternalUser(item.uuid)
        .then(() => {
          toast.add({ severity: "info", summary: "Confirmed", detail: "External User removed", life: 3000 });
        })
        .catch((reason) => {
          toast.add({
            severity: "error",
            summary: "Delete failed",
            detail: JSON.stringify(reason),
            life: 3000,
          });
        });
    },
  });
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
