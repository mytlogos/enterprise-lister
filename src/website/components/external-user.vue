<template>
  <div
    ref="root"
    class="external"
  >
    <h1 id="external-user">
      ExternalUser
    </h1>
    <i
      class="btn fa-plus fa btn-primary btn-success"
      @click="add.show = true"
    />
    <table
      class="table"
      aria-describedby="external-user"
    >
      <thead>
        <tr>
          <th scope="col">
            Name
          </th>
          <th scope="col">
            Host
          </th>
          <th
            class="action"
            scope="col"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in filteredData"
          :key="item"
        >
          <td>
            {{ item.identifier }}
          </td>
          <td>
            <a
              v-if="item.host"
              target="_blank"
              rel="noopener noreferrer"
              :href="item.host.link"
            >
              {{ item.host.name }}
            </a>
          </td>
          <td class="d-flex">
            <template v-if="item.identifier">
              <i
                class="btn delete fas fa-times btn-danger"
                @click="markDeleteItem(item)"
              />
              <i
                class="refresh fas fa-sync-alt btn btn-secondary"
                @click="refreshItem(item)"
              />
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <add-external-modal
      :error="add.error"
      :options="hosts"
      :show="add.show"
    />
    <confirm-modal
      :error="confirm.error"
      :show="confirm.show"
      :text="confirm.text"
      @yes="deleteItem()"
    />
  </div>
</template>

<script lang="ts">
import { emitBusEvent, onBusEvent } from "../bus";
import addExternalModal from "./modal/add-external-modal.vue";
import confirmModal from "./modal/confirm-modal.vue";

import { defineComponent } from "vue";
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
    currentLength: number;
    emptySpaceDirty: boolean;
    emptySpaceSpare: number;
}

export default defineComponent({
    name: "ExternalUser",
    components: { addExternalModal, confirmModal },
    data(): Data {
        return {
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
            currentLength: 0,
            emptySpaceDirty: false,
            emptySpaceSpare: 0,
        };
    },
    computed: {
        filteredData(): Array<ExternalUserItem | EmptyObject> {
            const data: Array<ExternalUserItem | EmptyObject> = this.$store.state.externalUser.externalUser
                .filter((value) => value)
                .map((value) => {
                    const host = this.hosts.find(
                        (hostValue) => hostValue.value === value.type
                    );
                    return { ...value, host } as ExternalUserItem;
                });

            // eslint-disable-next-line vue/no-side-effects-in-computed-properties
            this.currentLength = data.length;
            // iterate for the number of emptySpaces and push an empty object as an empty row
            for (let i = 0; i < this.emptySpace; i++) {
                data.push({});
            }
            return data;
        },

        emptySpace(): number {
            // $el is needed  to calculate the free space,
            // but computed property is called before being mounted
            if (!this.emptySpaceDirty) {
                return this.emptySpaceSpare;
            }
            console.log("Root", this.$refs.root);

            if (!this.$refs.root) {
                return 0;
            }
            const table = (this.$refs.root as HTMLElement).querySelector("table") as HTMLTableElement;
            const parent = table.parentElement as HTMLElement;
            const parentHeight = parseInt(
                window.getComputedStyle(parent).height,
                10
            );
            let siblingsHeight = 0;

            // calculate the height of the siblings of the table
            for (
                let child = parent.firstElementChild;
                child != null;
                child = child.nextElementSibling
            ) {
                const height = parseInt(
                    window.getComputedStyle(child).height,
                    10
                );

                // if it is not table, add it to siblingsHeight,
                // else set it as tableHeight
                if (child !== table) {
                    siblingsHeight += height;
                }
            }
            const theadHeight = parseInt(
                window.getComputedStyle(table.tHead as HTMLElement).height,
                10
            );
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
        user(n) {
            this.emptySpaceDirty = true;
            console.log(n);
        },

        currentLength() {
            this.emptySpaceDirty = true;
        },
    },

    mounted() {
        onBusEvent("reset:modal", () => {
            this.add.show = false;
            this.confirm.show = false;
            this.confirm.text = "";
            this.markDelete = null;
        });
        onBusEvent(
            "error:add:externalUser",
            (error) => (this.add.error = error)
        );
        onBusEvent("window:resize", () => (this.emptySpaceDirty = true));
    },
    methods: {
        markDeleteItem(item: ExternalUserItem | EmptyObject): void {
            this.markDelete = item.uuid;
            this.confirm.text =
                "Are you sure you want to delete" +
                item.identifier +
                "\nof " +
                item.host.name +
                " from this site?";
            // item.show = true;
            // TODO fix this modal? issue
        },
        deleteItem(): void {
            if (!this.markDelete) {
                return;
            }
            this.$store.dispatch("deleteExternalUser", this.markDelete);
        },

        refreshItem(item: ExternalUser | EmptyObject): void {
            emitBusEvent("refresh:externalUser", item.uuid);
        },
    },
});
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
