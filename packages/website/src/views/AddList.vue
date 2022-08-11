<template>
  <div class="container add-list">
    <div class="card m-1">
      <div class="card-body">
        <div class="card-title">Add Reading List</div>
        <div class="input-name">
          <h5>Name</h5>
          <input-text v-model="data.name" name="name" required title="List Name" type="text" />
        </div>
        <div class="input-medium">
          <h5>Medium:</h5>
          <SelectButton
            v-model="data.typeFilter"
            class="d-inline-block"
            :options="data.typeFilterValues"
            data-key="value"
            option-value="value"
            multiple
          >
            <template #option="slotProps">
              <i v-tooltip.top="slotProps.option.tooltip" :class="slotProps.option.icon" aria-hidden="true" />
            </template>
          </SelectButton>
        </div>
        <p-button class="mt-1" label="Add List" :loading="data.creating" type="button" @click="send" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { PrimeIcons } from "primevue/api";
import { MediaType } from "../siteTypes";
import { useListStore } from "../store/lists";
import { useToast } from "primevue/usetoast";

// TYPES
interface Data {
  name: string;
  creating: boolean;
  typeFilter: number[];
  typeFilterValues: Array<{
    tooltip: string;
    icon: string;
    value: number;
  }>;
}

// STORES
const listStore = useListStore();

// DATA
const data = ref<Data>({
  typeFilter: [],
  typeFilterValues: [
    {
      tooltip: "Search Text Media",
      icon: PrimeIcons.BOOK,
      value: MediaType.TEXT,
    },
    {
      tooltip: "Search Image Media",
      icon: PrimeIcons.IMAGE,
      value: MediaType.IMAGE,
    },
    {
      tooltip: "Search Video Media",
      icon: PrimeIcons.YOUTUBE,
      value: MediaType.VIDEO,
    },
    {
      tooltip: "Search Audio Media",
      icon: PrimeIcons.VOLUME_OFF,
      value: MediaType.AUDIO,
    },
  ],
  name: "",
  creating: false,
});

// COMPUTED

// WATCHES

// FUNCTIONS
const toast = useToast();
function send(): void {
  let mediumType = 0;
  data.value.typeFilter.forEach((value) => {
    if (value) {
      mediumType |= value;
    }
  });
  listStore
    .addList({ name: data.value.name, type: mediumType })
    .then(() => {
      toast.add({
        summary: "Success",
        detail: "Successful created List",
        severity: "success",
        life: 3000,
      });
    })
    .catch((error) => {
      toast.add({
        summary: "Error",
        detail: error + "",
        severity: "error",
        closable: true,
      });
    });
}
</script>
<style scoped>
@media (min-width: 576px) {
  .add-list {
    max-width: 560px;
  }
}
</style>
