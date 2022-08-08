<template>
  <div class="container-fluid p-0 d-flex">
    <list-box v-model="selectedList" :options="displayedLists" data-key="key" :filter="true">
      <template #option="slotProps">
        <span v-if="slotProps.option.external" class="pi pi-external-link me-2" />
        <span>{{ slotProps.option.name }}</span>
      </template>
    </list-box>
    <div class="w-100">
      <toolbar v-if="!selectedList?.external">
        <template #start>
          <p-button
            label="Delete List"
            class="p-button-danger me-2"
            style="min-width: 110px"
            :loading="deleteListLoading"
            @click="deleteList()"
          />
          <p-button
            label="Edit List"
            icon="pi pi-pencil"
            class="me-2"
            style="min-width: 116px"
            :loading="editListLoading"
            @click="startListEdit"
          />
          <div class="p-inputgroup">
            <AutoComplete
              v-model="selectedMedium"
              field="title"
              :suggestions="mediumSuggestions"
              force-selection
              placeholder="Add Medium to List"
              @complete="searchMedia($event)"
              @keyup.enter="addListItem"
            >
              <template #item="slotProps">
                <type-icon :type="slotProps.item.medium" class="me-1" />
                {{ slotProps.item.title }}
              </template>
            </AutoComplete>
            <p-button icon="pi pi-check" class="p-button-success" :loading="addItemLoading" @click="addListItem" />
          </div>
        </template>
      </toolbar>
      <data-table
        v-model:filters="filters"
        v-model:editingRows="editingRows"
        :value="items"
        edit-mode="row"
        striped-rows
        class="w-100"
        filter-display="row"
        paginator-position="both"
        :paginator="true"
        :rows="50"
        :loading="editItemLoading"
        paginator-template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
        current-page-report-template="Showing {first} to {last} of {totalRecords}"
        @row-edit-save="onRowEditSave"
      >
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
        <column field="stateTL" header="TL State" :show-filter-menu="false" sortable>
          <template #body="slotProps">
            <release-state :state="slotProps.data.stateTL" />
          </template>
          <template #editor="{ data, field }">
            <dropdown v-model="data[field]" :options="stateOptions">
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
              :options="stateOptions"
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
        <column field="title" header="Title" sortable>
          <template #body="slotProps">
            <router-link :to="{ name: 'medium', params: { id: slotProps.data.id } }">
              {{ slotProps.data.title }}
            </router-link>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText
              v-model="filterModel.value"
              type="text"
              class="p-column-filter"
              placeholder="Search by Title"
              @keydown.enter="filterCallback()"
            />
          </template>
          <template #editor="{ data, field }">
            <InputText v-model="data[field]" />
          </template>
        </column>
        <column field="totalEpisodes" header="Progress" sortable>
          <template #body="{ data }"> {{ data.readEpisodes || 0 }}/{{ data.totalEpisodes || 0 }} </template>
        </column>
        <column field="author" header="Author" sortable>
          <template #editor="{ data, field }">
            <InputText v-model="data[field]" />
          </template>
        </column>
        <column field="artist" header="Artist" sortable>
          <template #editor="{ data, field }">
            <InputText v-model="data[field]" />
          </template>
        </column>
        <Column :row-editor="true" style="width: 10%; min-width: 8rem" body-style="text-align:center" />
        <Column v-if="!selectedList?.external">
          <template #body="slotProps">
            <p-button
              icon="pi pi-trash"
              class="p-button-rounded p-button-warning"
              :loading="deleteItemLoading"
              @click="confirmDeleteListItem(slotProps.data)"
            />
          </template>
        </Column>
      </data-table>
      <p-dialog v-model:visible="displayEditDialog" header="Edit List">
        <span class="p-float-label">
          <input-text id="edit-list-name" v-model="editingList.name" name="name" required type="text" />
          <label for="edit-list-name">Name</label>
        </span>
        <SelectButton
          v-model="editingList.medium"
          class="d-inline-block"
          :options="typeFilterValues"
          data-key="value"
          option-value="value"
        >
          <template #option="slotProps">
            <i v-tooltip.top="slotProps.option.tooltip" :class="slotProps.option.icon" aria-hidden="true" />
          </template>
        </SelectButton>
        <template #footer>
          <p-button label="Close" icon="pi pi-times" class="p-button-text" @click="displayEditDialog = false" />
          <p-button label="Save" icon="pi pi-check" @click="saveList" />
        </template>
      </p-dialog>
      <ConfirmDialog></ConfirmDialog>
    </div>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import {
  StoreList,
  MediaType,
  Medium,
  SecondaryMedium,
  SimpleMedium,
  ReleaseState as ReleaseStateType,
} from "../siteTypes";
import typeIcon from "../components/type-icon.vue";
import releaseState from "../components/release-state.vue";
import { defineComponent } from "vue";
import { mergeMediaToc } from "../init";
import { FilterMatchMode, FilterService, PrimeIcons } from "primevue/api";
import { DataTableRowEditCancelEvent } from "primevue/datatable";
import { AutoCompleteCompleteEvent } from "primevue/autocomplete";
import { List } from "enterprise-core/dist/types";

interface MinList {
  name: string;
  medium: MediaType;
}

interface Data {
  loadingMedia: number[][];
  selectedList: null | DisplayList;
  displayEditDialog: boolean;
  loading: boolean;
  filters: Record<string, any>;
  mediumOptions: MediaType[];
  stateOptions: number[];
  editingRows: Medium[];
  typeFilterValues: Array<{
    tooltip: string;
    icon: string;
    value: MediaType;
  }>;
  editingList: MinList;
  selectedMedium: SimpleMedium | null;
  mediumSuggestions: SimpleMedium[];
  addItemLoading: boolean;
  deleteItemLoading: boolean;
  deleteListLoading: boolean;
  editListLoading: boolean;
  editItemLoading: boolean;
}

function emptyMinList(): MinList {
  return {
    name: "",
    medium: 0,
  };
}

type DisplayList = StoreList & {
  key: string;
};

FilterService.register(
  "lax-number-equals",
  (dataValue, filterValue) => filterValue == null || Number(dataValue ?? 0) === filterValue,
);

export default defineComponent({
  name: "Lists",
  components: {
    typeIcon,
    releaseState,
  },
  data(): Data {
    return {
      selectedMedium: null,
      mediumSuggestions: [],
      editingList: emptyMinList(),
      editingRows: [],
      loadingMedia: [],
      selectedList: null,
      displayEditDialog: false,
      loading: false,
      filters: {
        title: { value: null, matchMode: FilterMatchMode.CONTAINS },
        stateTL: { value: null, matchMode: "lax-number-equals" },
        medium: { value: null, matchMode: "lax-number-equals" },
      },
      mediumOptions: [MediaType.TEXT, MediaType.IMAGE, MediaType.VIDEO, MediaType.AUDIO],
      stateOptions: [
        ReleaseStateType.Unknown,
        ReleaseStateType.Ongoing,
        ReleaseStateType.Hiatus,
        ReleaseStateType.Complete,
        ReleaseStateType.Discontinued,
        ReleaseStateType.Dropped,
      ],
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
      addItemLoading: false,
      deleteItemLoading: false,
      deleteListLoading: false,
      editListLoading: false,
      editItemLoading: false,
    };
  },
  computed: {
    displayedLists(): DisplayList[] {
      const lists = [...this.lists];
      lists.sort((a, b) => a.name.localeCompare(b.name));
      return lists.map((list) => ({ ...list, key: list.id + "-" + list.external }));
    },
    lists(): StoreList[] {
      return this.$store.getters.allLists;
    },
    storeSelectedList(): StoreList | undefined {
      const selectedList = this.selectedList;

      if (!selectedList) {
        return;
      }
      if (selectedList.external) {
        return this.$store.getters.getExternalList(selectedList.id);
      }
      return this.$store.state.lists.lists.find((list) => list.id === selectedList.id);
    },
    items(): Medium[] {
      const selectedList = this.selectedList;

      if (!selectedList) {
        return [];
      }
      const items = this.storeSelectedList?.items;

      if (!items) {
        return [];
      }
      return items
        .map((id: number): Medium | undefined => {
          let medium = this.$store.getters.getMedium(id);
          if (!medium) {
            console.log("medium with id %d is not loaded", id);
            return medium;
          }
          const secondary: SecondaryMedium | undefined = this.$store.state.media.secondaryMedia[medium.id as number];

          if (!secondary) {
            return medium;
          }

          // make a copy, so that we do not modify the store value
          medium = { ...medium };
          medium.totalEpisodes = secondary.totalEpisodes;
          medium.readEpisodes = secondary.readEpisodes;

          mergeMediaToc(medium, secondary.tocs);
          return medium;
        })
        .filter((value) => value != null) as Medium[];
    },
    columns() {
      return this.$store.state.user.columns;
    },
  },
  watch: {
    displayedLists() {
      if (!this.selectedList) {
        this.selectedList = this.displayedLists[0];
      }
    },
    displayEditDialog() {
      if (!this.displayEditDialog) {
        this.editingList = emptyMinList();
      }
    },
    loadingMedia(newValue: number[][], oldValue: number[][]) {
      // TODO: use this function or remove it
      console.log("New:", newValue, "Old", oldValue);
      const missingBatches = newValue.filter((batch) => !oldValue.includes(batch));

      for (const missingBatch of missingBatches) {
        // load missing media
        HttpClient.getMedia(missingBatch)
          .then((media: SimpleMedium[]) => this.$store.commit("addMedium", media))
          .catch((error) => {
            this.$store.commit("errorModalError", String(error));
            console.log(error);
          })
          .finally(() => {
            // remove batch so it will be regarded as loaded, regardless whether it failed or not
            const index = this.loadingMedia.indexOf(missingBatch);

            if (index > 0) {
              this.loadingMedia.splice(index, 1);
            }
          });
      }
    },
  },
  mounted() {
    if (!this.selectedList) {
      this.selectedList = this.displayedLists[0];
    }
  },
  methods: {
    startListEdit() {
      this.editingList.name = this.storeSelectedList?.name || "";
      this.editingList.medium = this.storeSelectedList?.medium || 0;
      this.displayEditDialog = true;
    },
    saveList() {
      const selectedList = this.selectedList;
      if (!selectedList || selectedList?.external) {
        return;
      }

      if (!this.editingList.name.trim()) {
        this.$toast.add({
          summary: "Missing List name",
          severity: "error",
        });
        return;
      }
      if (!this.editingList.medium) {
        this.$toast.add({
          summary: "Missing List Medium",
          severity: "error",
        });
        return;
      }
      const currentList: List = {
        ...selectedList,
        name: this.editingList.name,
        medium: this.editingList.medium,
      };

      this.editListLoading = true;
      HttpClient.updateList(currentList)
        .then((success) => {
          if (success) {
            this.$store.commit("updateList", currentList);
            this.$toast.add({ severity: "success", summary: "Saved", detail: "List changes were saved", life: 3000 });
          } else {
            this.$toast.add({
              severity: "error",
              summary: "Save Error",
              detail: "Save was not successful",
              life: 3000,
            });
          }
        })
        .catch((reason) => {
          this.$toast.add({
            severity: "error",
            summary: "Save Error",
            detail: JSON.stringify(reason),
            life: 3000,
          });
        })
        .finally(() => {
          this.displayEditDialog = false;
          this.editListLoading = false;
        });
    },
    deleteList() {
      const listId = this.selectedList?.id;

      if (!listId) {
        return;
      }
      this.$confirm.require({
        message: "Are you sure you want to proceed?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        acceptClass: "p-button-danger",
        accept: () => {
          this.deleteListLoading = true;
          HttpClient.deleteList(listId)
            .then(() => {
              this.$store.commit("deleteList", listId);
              // select the next list
              this.selectedList = this.displayedLists.find((list) => list.id !== listId) || null;
              this.$toast.add({ severity: "info", summary: "Confirmed", detail: "Record deleted", life: 3000 });
            })
            .catch((reason) => {
              this.$toast.add({
                severity: "error",
                summary: "Delete failed",
                detail: JSON.stringify(reason),
                life: 3000,
              });
            })
            .finally(() => (this.deleteListLoading = false));
        },
      });
    },
    confirmDeleteListItem(data: Medium) {
      const list = this.selectedList;
      const mediumId = data?.id;

      if (!list || !mediumId) {
        return;
      }
      this.$confirm.require({
        message: `Remove '${data.title}' from List '${list.name}'?`,
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        acceptClass: "p-button-danger",
        accept: () => {
          this.deleteItemLoading = true;

          HttpClient.deleteListItem({ listId: list.id, mediumId: [mediumId] })
            .then(() => {
              this.$store.commit("removeListItem", { listId: list.id, mediumId });
              this.$toast.add({ severity: "info", summary: "Confirmed", detail: "Item removed from List", life: 3000 });
            })
            .catch((reason) => {
              this.$toast.add({
                severity: "error",
                summary: "Deleting Item failed",
                detail: JSON.stringify(reason),
                life: 3000,
              });
            })
            .finally(() => (this.deleteItemLoading = false));
        },
      });
    },
    onRowEditSave(event: DataTableRowEditCancelEvent) {
      console.log(event);
      this.editItemLoading = true;
      const newMedium: SimpleMedium = event.newData;

      HttpClient.updateMedium(newMedium)
        .then(() => {
          this.$store.commit("updateMedium", newMedium);
          this.$toast.add({ severity: "success", summary: "Medium updated", life: 3000 });
        })
        .catch((reason) => {
          this.$toast.add({
            severity: "error",
            summary: "Save failed",
            detail: JSON.stringify(reason),
            life: 3000,
          });
        })
        .finally(() => (this.editItemLoading = false));
    },
    addListItem() {
      const list = this.selectedList;
      const mediumId = this.selectedMedium?.id;

      if (!list || !mediumId) {
        this.selectedMedium = null;
        return;
      }
      this.addItemLoading = true;
      HttpClient.addListItem({ listId: list.id, mediumId: [mediumId] })
        .then(() => {
          this.$store.commit("addListItem", { listId: list.id, mediumId });
          this.$toast.add({ severity: "success", summary: "Success", detail: "Medium added to List", life: 3000 });
        })
        .catch((reason) => {
          this.$toast.add({
            severity: "error",
            summary: "Adding Item failed",
            detail: JSON.stringify(reason),
            life: 3000,
          });
        })
        .finally(() => (this.addItemLoading = false));
      this.selectedMedium = null;
    },
    searchMedia(event: AutoCompleteCompleteEvent) {
      const query = event.query.toLowerCase().trim();

      const current = new Set(this.selectedList?.items);

      this.mediumSuggestions = Object.values(this.$store.state.media.media).filter((medium) => {
        return !current.has(medium.id as number) && medium.title.toLowerCase().includes(query);
      });
    },
  },
});
</script>
