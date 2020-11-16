<template>
  <div class="external">
    <h1 id="external-user">
      ExternalUser
    </h1>
    <button
      class="btn add"
      @click="add.show = true"
    >
      +
    </button>
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
          <td>
            <template v-if="item.identifier">
              <button
                class="btn delete"
                @click="markDeleteItem(item)"
              >
                ×
              </button>
              <button
                class="refresh"
                @click="refreshItem(item)"
              >
                <!--suppress CheckImageSize -->
                <img
                  alt="Refresh"
                  height="20px"
                  src="../assets/refresh.png"
                  title="Refresh"
                  width="20px"
                >
              </button>
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

import { defineComponent, PropType } from "vue";
import { ExternalUser } from "../siteTypes";

interface ExternalListHost {
  link: string;
  value: number;
  name: string;
}

interface ExternalUserItem extends ExternalUser {
  host: ExternalListHost;
}

export default defineComponent({
    name: "ExternalUser",
    components: { addExternalModal, confirmModal },
    props: {
        user: { type: Array as PropType<ExternalUser[]>, required: true },
    },
    data(): any {
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
        filteredData(): ExternalUserItem[] {
            const data = this.user
                .filter((value) => value)
                .map((value) => {
                    const host = this.hosts.find(
                        (hostValue) => hostValue.values === value.type
                    );
                    return { ...value, host };
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
            const table = this.$el.querySelector("table");
            const parent = table.parentElement;
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
                window.getComputedStyle(table.tHead).height,
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
            this.show = false;
            this.show = false;
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
        markDeleteItem(item: ExternalUserItem): void {
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
            emitBusEvent("delete:externalUser", this.markDelete);
        },

        refreshItem(item: ExternalUser): void {
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

.add {
    background-color: #4189b7;
    height: 40px;
    color: white;
    font-size: 35px;
    padding: 0 12px;
}

.refresh {
    background: none;
}

.refresh:hover {
    cursor: pointer;
}

.delete {
    background-color: #b73235;
    height: 20px;
    width: 20px;
    color: white;
    font-size: 20px;
    padding: 0;
}

.delete:hover {
    background-color: #dd3c3f;
}
</style>
