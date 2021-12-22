<template>
  <div ref="root">
    <delete-modal v-bind="deleteModal" @hide="deleteModal.show = false" />
    <div class="container-fluid d-flex p-1">
      <div class="btn-group me-sm-3" role="group" aria-label="Select what to filter on">
        <button class="btn btn-secondary all reset" name="all" type="reset" @click="showAll">All</button>
        <button
          v-for="column of columns"
          :key="column.name"
          class="btn btn-secondary"
          type="button"
          :class="{ checked: column.show }"
          @click="column.show = !column.show"
        >
          {{ column.name }}
        </button>
      </div>
      <form class="row">
        <div class="col-2 me-sm-2 dropdown dropdown-btn" :class="{ hidden: !showSearch }">
          <input v-model="filter" class="form-control" placeholder="Type your Search..." type="text" />
        </div>
        <button class="col-2 btn bg-dark btn-dark search" type="submit" @click="showSearch = !showSearch">
          Search
        </button>
      </form>
    </div>
    <table class="table" aria-label="Table of Medium Items">
      <thead>
        <tr>
          <th scope="col" class="fit">No.</th>
          <th scope="col" class="fit">Type</th>
          <th scope="col" class="fit">State from TL</th>
          <th scope="col">Title</th>
          <th
            v-for="column in columns"
            v-show="column.show"
            :key="column.name"
            :class="{ active: sortProp === column.prop }"
            scope="col"
            @click="sortBy(column.prop)"
          >
            {{ column.name }}
            <span :class="sortOrders[column.prop] > 0 ? 'asc' : 'dsc'" class="arrow" />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(entry, index) in filteredData"
          :key="entry.id"
          @click.ctrl="openMedium(entry.id)"
          @keyup.enter.ctrl="openMedium(marked.id)"
        >
          <td
            class="fit"
            :class="{
              marked: marked.id != null && marked.id === entry.id,
            }"
          >
            {{ entry.id != null ? index + 1 : "" }}
          </td>
          <td class="fit">
            <type-icon :type="$store.getters.getMergedProp(entry, 'medium')" />
          </td>
          <td class="fit">
            <release-state :state="$store.getters.getMergedProp(entry, 'stateTL')" />
          </td>
          <td>
            <router-link :to="{ name: 'medium', params: { id: entry.id } }">
              {{ entry.title }}
            </router-link>
          </td>
          <td
            v-for="column in columns"
            v-show="column.show"
            :key="column.name"
            :class="{
              marked: marked.id != null && marked.id === entry.id,
            }"
            @click="mark(entry, index, column.prop)"
            @dblclick="startEdit(entry, column.prop)"
          >
            <label v-if="editCell.id === entry.id && editCell.prop === column.prop">
              <input v-model="editCell.value" @blur="stopEdit" @keyup.enter="stopEdit" />
            </label>
            <template v-else>
              {{ $store.getters.getMergedProp(entry, column.prop) }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { emitBusEvent, onBusEvent } from "../bus";
import deleteModal from "./modal/delete-modal.vue";
import typeIcon from "../components/type-icon.vue";
import releaseState from "../components/release-state.vue";

// FIXME user can edit empty rows

const Move = {
  LEFT: 0x1,
  RIGHT: 0x2,
  DOWN: 0x4,
  UP: 0x8,
};

interface Data {
  isFirst: boolean;
  emptySpaceDirty: boolean;
  emptySpaceSpare: number;
  sortProp: string;
  sortOrders: any;
  marked: {
    id: null | number;
    index: null | number;
    prop: null | StringKey<Medium>;
  };
  editCell: {
    id: null | number;
    prop: null | StringKey<Medium>;
    value: null | any;
  };
  listFocused: boolean;
  sendFocus: boolean;
  deleteModal: {
    show: boolean;
    object: any;
  };
  showSearch: boolean;
  filter: string;
  currentLength: number;
  focused: boolean;
  clickListener: ClickListener | null;
  typeListener: KeyboardListener | null;
}
import { defineComponent, PropType } from "vue";
import { ClickListener, KeyboardListener, Column, EmptyObject, Medium, StringKey } from "../siteTypes";

export default defineComponent({
  name: "AppTable",
  components: {
    deleteModal,
    typeIcon,
    releaseState,
  },
  props: {
    items: { type: Array as PropType<Medium[]>, required: true },
    columns: { type: Array as PropType<Column[]>, required: true },
    filterKey: { type: String, required: true },
  },
  data(): Data {
    return {
      isFirst: true,
      emptySpaceDirty: false,
      emptySpaceSpare: 0,
      sortProp: "",
      sortOrders: {},
      marked: {
        id: null,
        index: null,
        prop: null,
      },
      editCell: {
        id: null,
        prop: null,
        value: null,
      },
      listFocused: false,
      sendFocus: false,
      deleteModal: {
        show: false,
        object: {},
      },
      showSearch: false,
      filter: "",
      currentLength: 0,
      focused: false,
      clickListener: null,
      typeListener: null,
    };
  },

  computed: {
    filteredData(): Array<Medium | EmptyObject> {
      const sortKey = this.sortProp;
      let filterKey = this.filter;
      const order = this.sortOrders[sortKey] || 1;
      // removing an item in the array with splice from within the vue instance
      // leads magically to undefined here, so filter it anything wrong out
      let data: Array<Medium | EmptyObject> = this.items.filter((value) => value);

      // filter data by searching all stringified properties by the value of filterKey
      if (filterKey) {
        filterKey = filterKey.toLowerCase();
        data = data.filter((row) =>
          Object.keys(row).some((key) => String(row[key]).toLowerCase().indexOf(filterKey) > -1),
        );
      }
      if (sortKey) {
        data.sort((a, b) => {
          a = a[sortKey];
          b = b[sortKey];
          if (a === b) {
            return 0;
          } else {
            if (a > b) {
              return 1 * order;
            } else {
              return -1 * order;
            }
          }
        });
      }
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      this.currentLength = data.length;
      // iterate for the number of emptySpaces and push an empty object as an empty row
      // for (let i = 0; i < this.emptySpace; i++) {
      //     data.push({});
      // }
      return data;
    },

    emptySpace(): number {
      // $el is needed  to calculate the free space,
      // but computed property is called before being mounted
      if (!this.emptySpaceDirty) {
        return this.emptySpaceSpare;
      }
      const root = this.$refs.root as HTMLElement | undefined;
      if (!root) {
        console.error("No root ref defined in app-table");
        return 0;
      }
      const table = root.querySelector("table") as HTMLTableElement;
      const parent = table.parentElement as HTMLElement;
      const parentHeight = parseInt(window.getComputedStyle(parent).height, 10);
      let siblingsHeight = 0;

      // calculate the height of the siblings of the table
      for (let child = parent.firstElementChild; child != null; child = child.nextElementSibling) {
        const height = parseInt(window.getComputedStyle(child).height, 10);

        // if it is not table, add it to siblingsHeight,
        // else set it as tableHeight
        if (child !== table) {
          siblingsHeight += height;
        }
      }
      const theadHeight = parseInt(window.getComputedStyle(table.tHead as HTMLElement).height, 10);
      // calculate the empty space for table
      let remaining = parentHeight - theadHeight;
      remaining -= siblingsHeight;
      remaining -= this.currentLength * 40;

      if (remaining < 40) {
        remaining = 0;
      } else {
        remaining /= 40;
        remaining = Math.floor(remaining);
      }

      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      this.emptySpaceDirty = false;
      // remove the decimal places, so that at most one less row is build
      // (better than one too many, which would lead to a scrollbar)
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      this.emptySpaceSpare = remaining;
      return this.emptySpaceSpare;
    },
  },
  watch: {
    data() {
      this.emptySpaceDirty = true;
    },
    currentLength() {
      this.emptySpaceDirty = true;
    },
    showSearch(newValue) {
      if (newValue) {
        setTimeout(() => {
          const input = this.getRoot().querySelector(".dropdown input") as HTMLInputElement;
          input.focus();
        }, 200);
      } else {
        this.filter = "";
      }
    },
  },

  mounted() {
    this.emptySpaceDirty = true;
    this.columns.forEach((value) => (this.sortOrders[value.prop] = 1));

    onBusEvent("window:resize", () => (this.emptySpaceDirty = true));

    this.clickListener = (evt) => {
      const root = this.getRoot();
      if (!root) {
        console.warn("Did not have expected Root");
        return;
      }
      this.focused = root.contains(evt.target as Node | null);
    };
    document.addEventListener("click", this.clickListener);

    this.typeListener = (evt) => {
      if (!this.listFocused) {
        return;
      }
      if (evt.key === "ArrowDown") {
        this.selectCell(Move.DOWN);
      } else if (evt.key === "ArrowUp") {
        this.selectCell(Move.UP);
      } else if (evt.key === "ArrowLeft") {
        this.selectCell(Move.LEFT);
      } else if (evt.key === "ArrowRight") {
        this.selectCell(Move.RIGHT);
      } else if (evt.key === "Enter") {
        if (this.editCell.id != null) {
          this.stopEdit();
        } else {
          const entry = this.filteredData[this.marked.index as number];

          if (entry.id) {
            this.startEdit(entry as Medium, this.marked.prop as string);
          }
        }
      } else if (evt.key === "Delete") {
        if (this.marked.id == null) {
          return;
        }
        const entry = this.filteredData[this.marked.index as number];
        this.deleteModal.object = {
          id: entry.id,
          name: entry.title,
          type: "medium",
        };
        // Plato.show = true;
      } else if (evt.key === "Tab") {
        if (this.editCell.id == null) {
          return;
        }
        this.stopEdit();
        this.selectCell(Move.RIGHT);
        const entry = this.filteredData[this.marked.index as number];
        // FIXME this does not go as intended
        if (entry.id) {
          this.startEdit(entry as Medium, this.marked.prop as string);
        }
      }
    };
    document.addEventListener("keydown", this.typeListener);
  },
  unmounted() {
    if (this.typeListener) {
      document.removeEventListener("keydown", this.typeListener);
    }
    if (this.clickListener) {
      document.removeEventListener("click", this.clickListener);
    }
  },
  methods: {
    getRoot() {
      return this.$refs.root as HTMLElement;
    },
    openMedium(mediumId?: number | null): void {
      if (mediumId == null) {
        return;
      }
      emitBusEvent("open:medium", mediumId);
    },

    deleteData(id: number): void {
      this.$store.dispatch("deleteMedium", id);
    },

    mark(entry: Medium | EmptyObject, index: number, prop: StringKey<Medium>): void {
      this.marked.id = entry.id;
      this.marked.index = index;
      this.marked.prop = prop;
    },

    startEdit(entry: Medium | EmptyObject, prop: StringKey<Medium>): void {
      this.editCell.id = entry.id;
      this.editCell.prop = prop;
      this.editCell.value = entry[prop];
      // input is not yet available, only after this method is over, so set a timeout to focus
      setTimeout(() => {
        const input = this.getRoot().querySelector("td input") as HTMLInputElement;
        input.focus();
      }, 200);
    },

    stopEdit(): void {
      if (this.editCell.id == null) {
        return;
      }
      this.$store.dispatch("editMedium", {
        id: this.editCell.id,
        prop: this.editCell.prop,
        value: this.editCell.value,
      });
      this.editCell.id = null;
      this.editCell.prop = null;
      this.editCell.value = null;
    },

    sortBy(key: string): void {
      this.sortProp = key;
      this.sortOrders[key] = this.sortOrders[key] * -1;
    },

    showAll(): void {
      this.columns.forEach((value: Column) => (value.show = true));
    },

    selectCell(direction: number): void {
      if (this.marked.id == null || this.marked.index == null) {
        if (!this.filteredData.length) {
          return;
        }
        this.marked.prop = this.columns[0].prop;
        this.marked.id = this.filteredData[0].id;
        this.marked.index = 0;
        return;
      }
      if (direction === Move.DOWN) {
        if (this.marked.index + 1 === this.filteredData.length) {
          return;
        }
        this.marked.index++;
      } else if (direction === Move.UP) {
        // zero is the earliest
        if (this.marked.index === 0) {
          return;
        }
        this.marked.index--;
      } else if (direction === Move.RIGHT) {
        const index = this.columns.findIndex((value) => value.prop === this.marked.prop);
        if (index === this.columns.length - 1) {
          return;
        }
        this.marked.prop = this.columns[index + 1].prop;
      } else if (direction === Move.LEFT) {
        const index = this.columns.findIndex((value) => value.prop === this.marked.prop);
        if (index === 0) {
          return;
        }
        this.marked.prop = this.columns[index - 1].prop;
      }
      this.marked.id = this.filteredData[this.marked.index].id;
    },
  },
});
</script>

<style scoped>
.table td.fit,
.table th.fit {
  white-space: nowrap;
  width: 1%;
}
/* .narrow {
        width: 20px;
    }

    td + td {
        border-left: #bdbdbd 1px solid;
    }

    .arrow {
        display: inline-block;
        vertical-align: middle;
        width: 0;
        height: 0;
        margin-left: 5px;
        opacity: 0.66;
    }

    .arrow.asc {
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 4px solid #fff;
    }

    .arrow.dsc {
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 4px solid #fff;
    } */
</style>
