<template>
  <div class="container-fluid p-0">
    <Toolbar>
      <template #start>
        <h3 class="m-0">Media</h3>
        <SelectButton
          v-model="showStatesTL"
          class="mx-2"
          :options="showStatesTLOptions"
          option-value="value"
          option-label="name"
          multiple
        />
        <div>
          <checkbox id="hide-completed" v-model="hideCompleted" class="align-middle" :binary="true" />
          <label class="ms-1" for="hide-completed">Hide Completed Media</label>
        </div>
      </template>
    </Toolbar>
    <data-table
      v-model:filters="filters"
      v-model:editingRows="editingRows"
      class="p-datatable-sm"
      :value="filteredMedia"
      filter-display="row"
      striped-rows
      sort-field="title"
      :sort-order="1"
      :paginator="true"
      :rows="10"
      paginator-position="both"
      paginator-template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      :rows-per-page-options="[10, 20, 50]"
      responsive-layout="scroll"
      current-page-report-template="Showing {first} to {last} of {totalRecords}"
      :loading="editItemLoading"
      edit-mode="row"
      @row-edit-save="onRowEditSave"
    >
      <template #empty> No records found </template>
      <template #loading> Loading records, please wait... </template>
      <Column :row-editor="true" style="min-width: 5rem" body-style="text-align:center" />
      <Column field="title" header="Title" sortable>
        <template #body="slotProps">
          <router-link :to="{ name: 'medium', params: { id: slotProps.data.id } }">
            {{ slotProps.data.title }}
          </router-link>
        </template>
        <template #editor="{ data, field }">
          <InputText v-model="data[field]" />
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            class="p-column-filter"
            placeholder="Search Title"
            @keydown.enter="filterCallback()"
          />
        </template>
      </Column>
      <column field="medium" header="Type" :show-filter-menu="false" sortable>
        <template #body="slotProps">
          <type-icon :type="slotProps.data.medium" />
        </template>
        <template #editor="{ data, field }">
          <dropdown v-model="data[field]" :options="mediumOptions">
            <template #value="slotProps">
              <type-icon :type="slotProps.value" />
            </template>
            <template #option="slotProps">
              <type-icon :type="slotProps.option" />
            </template>
          </dropdown>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <dropdown
            v-model="filterModel.value"
            :options="mediumOptions"
            placeholder="Any"
            class="p-column-filter"
            :show-clear="true"
            @change="filterCallback()"
          >
            <template #value="{ value }">
              <type-icon v-if="value" :type="value" />
              <span v-else>Any</span>
            </template>
            <template #option="slotProps">
              <type-icon :type="slotProps.option" />
            </template>
          </dropdown>
        </template>
      </column>
      <Column field="totalEpisodes" header="Progress" sortable>
        <template #body="slotProps">
          {{ slotProps.data.readEpisodes || 0 }}/{{ slotProps.data.totalEpisodes || 0 }}
        </template>
      </Column>
      <column field="stateOrigin" header="State in COO" :show-filter-menu="false" sortable>
        <template #body="slotProps">
          <release-state :state="slotProps.data.stateOrigin" />
        </template>
        <template #editor="{ data, field }">
          <dropdown v-model="data[field]" :options="statesOptions">
            <template #value="slotProps">
              <release-state :state="slotProps.value" />
            </template>
            <template #option="slotProps">
              <release-state :state="slotProps.option" />
            </template>
          </dropdown>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <dropdown
            v-model="filterModel.value"
            :options="statesOptions"
            placeholder="Any"
            class="p-column-filter"
            :show-clear="true"
            @change="filterCallback()"
          >
            <template #value="{ value }">
              <release-state v-if="value != null" :state="value" />
              <span v-else>Any</span>
            </template>
            <template #option="slotProps">
              <release-state :state="slotProps.option" />
            </template>
          </dropdown>
        </template>
      </column>
      <column field="stateTL" header="State from TL" sortable>
        <template #body="slotProps">
          <release-state :state="slotProps.data.stateTL" />
        </template>
        <template #editor="{ data, field }">
          <dropdown v-model="data[field]" :options="statesOptions">
            <template #value="slotProps">
              <release-state :state="slotProps.value" />
            </template>
            <template #option="slotProps">
              <release-state :state="slotProps.option" />
            </template>
          </dropdown>
        </template>
      </column>
      <Column field="author" header="Author">
        <template #editor="{ data, field }">
          <InputText v-model="data[field]" />
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            v-model="filterModel.value"
            type="text"
            class="p-column-filter"
            placeholder="Search Author"
            @keydown.enter="filterCallback()"
          />
        </template>
      </Column>
    </data-table>
  </div>
</template>

<script lang="ts" setup>
import { SimpleMedium, ReleaseState, SecondaryMedium, MediaType, Medium as StoreMedium } from "../siteTypes";
import releaseState from "../components/release-state.vue";
import typeIcon from "../components/type-icon.vue";
import { computed, ref } from "vue";
import { mergeMediaToc } from "../init";
import { DataTableRowEditCancelEvent } from "primevue/datatable";
import { HttpClient } from "../Httpclient";
import { FilterMatchMode, FilterService } from "primevue/api";
import { useMediaStore } from "../store/media";
import { useToast } from "primevue/usetoast";

// TYPES
interface Medium extends SimpleMedium {
  readEpisodes: number;
  totalEpisodes: number;
}

FilterService.register(
  "lax-number-equals",
  (dataValue, filterValue) => filterValue == null || Number(dataValue ?? 0) === filterValue,
);

// DATA
const editingRows = ref([] as Medium[]);
const filters = {
  stateOrigin: { value: null, matchMode: "lax-number-equals" },
  medium: { value: null, matchMode: "lax-number-equals" },
  author: { value: null, matchMode: FilterMatchMode.CONTAINS },
  title: { value: null, matchMode: FilterMatchMode.CONTAINS },
};
const editItemLoading = ref(false);
const showStatesTLOptions = [
  {
    name: "Unknown",
    value: ReleaseState.Unknown,
  },
  {
    name: "Ongoing",
    value: ReleaseState.Ongoing,
  },
  {
    name: "Hiatus",
    value: ReleaseState.Hiatus,
  },
  {
    name: "Discontinued",
    value: ReleaseState.Discontinued,
  },
  {
    name: "Dropped",
    value: ReleaseState.Dropped,
  },
  {
    name: "Complete",
    value: ReleaseState.Complete,
  },
];
const mediumOptions = [MediaType.TEXT, MediaType.IMAGE, MediaType.VIDEO, MediaType.AUDIO];
const showStatesTL = ref([
  ReleaseState.Unknown,
  ReleaseState.Ongoing,
  ReleaseState.Hiatus,
  ReleaseState.Discontinued,
  ReleaseState.Dropped,
  ReleaseState.Complete,
]);
const statesOptions = [
  ReleaseState.Unknown,
  ReleaseState.Ongoing,
  ReleaseState.Hiatus,
  ReleaseState.Discontinued,
  ReleaseState.Dropped,
  ReleaseState.Complete,
];
const hideCompleted = ref(false);

// STORES
const mediaStore = useMediaStore();

// COMPUTED
const media = computed(() => {
  return mediaStore.mediaList.map((value: StoreMedium): Medium => {
    const secondary: SecondaryMedium | undefined = mediaStore.secondaryMedia[value.id];

    // Make a copy so that mergeMedia/mergeMediaToc does not operate on store values
    const copy = { ...value, totalEpisodes: 0, readEpisodes: 0 };
    if (!secondary) {
      return copy;
    }

    copy.totalEpisodes = secondary.totalEpisodes;
    copy.readEpisodes = secondary.readEpisodes;

    // @ts-expect-error
    return mergeMediaToc(copy, secondary.tocs);
  });
});

const filteredMedia = computed((): Medium[] => {
  return media.value.filter((medium: Medium) => {
    if (medium.stateTL == null) {
      return showStatesTL.value.includes(ReleaseState.Unknown);
    }
    if (!showStatesTL.value.includes(medium.stateTL)) {
      return false;
    }
    return hideCompleted.value
      ? medium.stateTL === ReleaseState.Complete && medium.readEpisodes !== medium.totalEpisodes
      : true;
  });
});

function onRowEditSave(event: DataTableRowEditCancelEvent) {
  console.log(event);
  editItemLoading.value = true;
  const newMedium: SimpleMedium = event.newData;

  HttpClient.updateMedium(newMedium)
    .then(() => {
      mediaStore.updateMediumLocal(newMedium);
      useToast().add({ severity: "success", summary: "Medium updated", life: 3000 });
    })
    .catch((reason) => {
      useToast().add({
        severity: "error",
        summary: "Save failed",
        detail: JSON.stringify(reason),
        life: 3000,
      });
    })
    .finally(() => (editItemLoading.value = false));
}
</script>
