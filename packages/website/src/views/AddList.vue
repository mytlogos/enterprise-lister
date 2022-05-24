<template>
  <div class="container add-list">
    <div class="card m-1">
      <div class="card-body">
        <div class="card-title">Add Reading List</div>
        <div class="input-name">
          <h5>Name</h5>
          <input-text v-model="name" name="name" required title="List Name" type="text" />
        </div>
        <div class="input-medium">
          <h5>Medium:</h5>
          <SelectButton
            v-model="typeFilter"
            class="d-inline-block"
            :options="typeFilterValues"
            data-key="value"
            option-value="value"
            multiple
          >
            <template #option="slotProps">
              <i v-tooltip.top="slotProps.option.tooltip" :class="slotProps.option.icon" aria-hidden="true" />
            </template>
          </SelectButton>
        </div>
        <p-button class="mt-1" label="Add List" :loading="creating" type="button" @click="send" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PrimeIcons } from "primevue/api";
import { MediaType } from "../siteTypes";

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

export default defineComponent({
  name: "AddList",
  data(): Data {
    return {
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
    };
  },

  methods: {
    send(): void {
      let mediumType = 0;
      this.typeFilter.forEach((value) => {
        if (value) {
          mediumType |= value;
        }
      });
      this.$store
        .dispatch("addList", { name: this.name, type: mediumType })
        .then(() => {
          this.$toast.add({
            summary: "Success",
            detail: "Successful created List",
            severity: "success",
            life: 3000,
          });
        })
        .catch((error) => {
          this.$toast.add({
            summary: "Error",
            detail: error + "",
            severity: "error",
            closable: true,
          });
        });
    },
  },
});
</script>
<style scoped>
@media (min-width: 576px) {
  .add-list {
    max-width: 560px;
  }
}
</style>
