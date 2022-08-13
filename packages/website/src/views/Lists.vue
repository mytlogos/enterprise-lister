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
        <span class="p-float-label mt-4 mb-2">
          <input-text id="edit-list-name" v-model="editingList.name" name="name" required type="text" />
          <label for="edit-list-name">Name</label>
        </span>
        <MediaFilter v-model:state="editingList.medium" />
        <template #footer>
          <p-button label="Close" icon="pi pi-times" class="p-button-text" @click="displayEditDialog = false" />
          <p-button label="Save" icon="pi pi-check" @click="saveList" />
        </template>
      </p-dialog>
    </div>
  </div>
</template>

<script lang="ts" setup>
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
import MediaFilter from "../components/media-filter.vue";
import { computed, ref, watch, watchEffect } from "vue";
import { mergeMediaToc } from "../init";
import { FilterMatchMode, FilterService } from "primevue/api";
import { DataTableRowEditCancelEvent } from "primevue/datatable";
import { AutoCompleteCompleteEvent } from "primevue/autocomplete";
import { List } from "enterprise-core/dist/types";
import { useMediaStore } from "../store/media";
import { useListStore } from "../store/lists";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { useExternalUserStore } from "../store/externaluser";

// TYPES
interface MinList {
  name: string;
  medium: MediaType;
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

// STORES
const mediaStore = useMediaStore();
const listsStore = useListStore();
const externalUserStore = useExternalUserStore();

// DATA
const selectedMedium = ref<SimpleMedium | null>(null);
const mediumSuggestions = ref<Medium[]>([]);
const editingList = ref(emptyMinList());
const editingRows = ref<Medium[]>([]);
const loadingMedia = ref<number[][]>([]);
const selectedList = ref<null | DisplayList>(null);
const displayEditDialog = ref(false);
const filters = {
  title: { value: null, matchMode: FilterMatchMode.CONTAINS },
  stateTL: { value: null, matchMode: "lax-number-equals" },
  medium: { value: null, matchMode: "lax-number-equals" },
};
const mediumOptions = [MediaType.TEXT, MediaType.IMAGE, MediaType.VIDEO, MediaType.AUDIO];
const stateOptions = [
  ReleaseStateType.Unknown,
  ReleaseStateType.Ongoing,
  ReleaseStateType.Hiatus,
  ReleaseStateType.Complete,
  ReleaseStateType.Discontinued,
  ReleaseStateType.Dropped,
];
const addItemLoading = ref(false);
const deleteItemLoading = ref(false);
const deleteListLoading = ref(false);
const editListLoading = ref(false);
const editItemLoading = ref(false);

// COMPUTED
const displayedLists = computed((): DisplayList[] => {
  const copy = [...lists.value];
  copy.sort((a, b) => a.name.localeCompare(b.name));
  return copy.map((list) => ({ ...list, key: list.id + "-" + list.external }));
});

const lists = computed((): StoreList[] => {
  return listsStore.allLists;
});

const storeSelectedList = computed((): StoreList | undefined => {
  const value = selectedList.value;
  if (!value) {
    return;
  }
  if (value.external) {
    return externalUserStore.getExternalList(value.id);
  }
  return listsStore.lists.find((list) => list.id === value.id);
});

const items = computed((): Medium[] => {
  const list = selectedList.value;

  if (!list) {
    return [];
  }
  const listItems = storeSelectedList.value?.items;

  if (!listItems) {
    return [];
  }
  return listItems
    .map((id: number): Medium | undefined => {
      let medium = mediaStore.media[id];
      if (!medium) {
        console.log("medium with id %d is not loaded", id);
        return medium;
      }
      const secondary: SecondaryMedium | undefined = mediaStore.secondaryMedia[medium.id];

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
});

// WATCHES
watchEffect(() => {
  if (!selectedList.value) {
    selectedList.value = displayedLists.value[0];
  }
});

watchEffect(() => {
  if (!displayEditDialog.value) {
    editingList.value = emptyMinList();
  }
});

watch(loadingMedia, (newValue: number[][], oldValue: number[][]) => {
  // TODO: use function or remove it
  console.log("New:", newValue, "Old", oldValue);
  const missingBatches = newValue.filter((batch) => !oldValue.includes(batch));

  for (const missingBatch of missingBatches) {
    // load missing media
    HttpClient.getMedia(missingBatch)
      .then((media) => mediaStore.addMediumLocal(media))
      .catch((error) => {
        // TODO: display error
        console.log(error);
      })
      .finally(() => {
        // remove batch so it will be regarded as loaded, regardless whether it failed or not
        const index = loadingMedia.value.indexOf(missingBatch);

        if (index > 0) {
          loadingMedia.value.splice(index, 1);
        }
      });
  }
});

// LIFECYCLE EVENTS

// FUNCTIONS
const toast = useToast();
const confirm = useConfirm();

function startListEdit() {
  editingList.value.name = storeSelectedList.value?.name || "";
  editingList.value.medium = storeSelectedList.value?.medium || 0;
  displayEditDialog.value = true;
}
function saveList() {
  const value = selectedList.value;
  if (!value || value?.external) {
    return;
  }

  if (!editingList.value.name.trim()) {
    toast.add({
      summary: "Missing List name",
      severity: "error",
    });
    return;
  }
  if (!editingList.value.medium) {
    toast.add({
      summary: "Missing List Medium",
      severity: "error",
    });
    return;
  }
  const currentList: List = {
    ...value,
    name: editingList.value.name,
    medium: editingList.value.medium,
  };

  editListLoading.value = true;
  HttpClient.updateList(currentList)
    .then((success) => {
      if (success) {
        listsStore.updateListLocal(currentList);
        toast.add({ severity: "success", summary: "Saved", detail: "List changes were saved", life: 3000 });
      } else {
        toast.add({
          severity: "error",
          summary: "Save Error",
          detail: "Save was not successful",
          life: 3000,
        });
      }
    })
    .catch((reason) => {
      toast.add({
        severity: "error",
        summary: "Save Error",
        detail: JSON.stringify(reason),
        life: 3000,
      });
    })
    .finally(() => {
      displayEditDialog.value = false;
      editListLoading.value = false;
    });
}
function deleteList() {
  const listId = selectedList.value?.id;

  if (!listId) {
    return;
  }
  confirm.require({
    message: "Are you sure you want to proceed?",
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: () => {
      // TODO: make this an action
      deleteListLoading.value = true;
      HttpClient.deleteList(listId)
        .then(() => {
          listsStore.deleteListLocal(listId);
          // select the next list
          selectedList.value = displayedLists.value.find((list) => list.id !== listId) || null;
          toast.add({ severity: "info", summary: "Confirmed", detail: "Record deleted", life: 3000 });
        })
        .catch((reason) => {
          toast.add({
            severity: "error",
            summary: "Delete failed",
            detail: JSON.stringify(reason),
            life: 3000,
          });
        })
        .finally(() => (deleteListLoading.value = false));
    },
  });
}
function confirmDeleteListItem(data: Medium) {
  const list = selectedList.value;
  const mediumId = data?.id;

  if (!list || !mediumId) {
    return;
  }
  confirm.require({
    message: `Remove '${data.title}' from List '${list.name}'?`,
    header: "Confirmation",
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: () => {
      deleteItemLoading.value = true;

      HttpClient.deleteListItem({ listId: list.id, mediumId: [mediumId] })
        .then(() => {
          listsStore.removeListItemLocal({ listId: list.id, mediumId });
          toast.add({ severity: "info", summary: "Confirmed", detail: "Item removed from List", life: 3000 });
        })
        .catch((reason) => {
          toast.add({
            severity: "error",
            summary: "Deleting Item failed",
            detail: JSON.stringify(reason),
            life: 3000,
          });
        })
        .finally(() => (deleteItemLoading.value = false));
    },
  });
}
function onRowEditSave(event: DataTableRowEditCancelEvent) {
  console.log(event);
  editItemLoading.value = true;
  const newMedium: SimpleMedium = event.newData;

  HttpClient.updateMedium(newMedium)
    .then(() => {
      mediaStore.updateMediumLocal(newMedium);
      toast.add({ severity: "success", summary: "Medium updated", life: 3000 });
    })
    .catch((reason) => {
      toast.add({
        severity: "error",
        summary: "Save failed",
        detail: JSON.stringify(reason),
        life: 3000,
      });
    })
    .finally(() => (editItemLoading.value = false));
}
function addListItem() {
  const list = selectedList.value;
  const mediumId = selectedMedium.value?.id;

  if (!list || !mediumId) {
    selectedMedium.value = null;
    return;
  }
  addItemLoading.value = true;
  HttpClient.addListItem({ listId: list.id, mediumId: [mediumId] })
    .then(() => {
      listsStore.addListItemLocal({ listId: list.id, mediumId });
      toast.add({ severity: "success", summary: "Success", detail: "Medium added to List", life: 3000 });
    })
    .catch((reason) => {
      toast.add({
        severity: "error",
        summary: "Adding Item failed",
        detail: JSON.stringify(reason),
        life: 3000,
      });
    })
    .finally(() => (addItemLoading.value = false));
  selectedMedium.value = null;
}
function searchMedia(event: AutoCompleteCompleteEvent) {
  const query = event.query.toLowerCase().trim();

  const current = new Set(selectedList.value?.items);

  mediumSuggestions.value = mediaStore.mediaList.filter((medium) => {
    return !current.has(medium.id) && medium.title.toLowerCase().includes(query);
  });
}
</script>
