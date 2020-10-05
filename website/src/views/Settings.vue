<template>
  <div class="settings">
    <div class="settings-list left-content">
      <label>
        <input
          v-model="filter"
          type="text"
        >
      </label>
      <list-comp
        :data="lists"
        :filter="filter"
        :focused="listFocused"
        :multi="false"
      />
    </div>
    <div class="page">
      <external-user
        v-if="show === 0"
        :user="externalUser"
      />
    </div>
  </div>
</template>

<script>
import {onBusEvent} from "../bus";
import listComp from "../components/list-comp";
import externalUser from "../components/external-user";

export default {
    name: "SettingsPage",
    components: {
        listComp,
        externalUser,
    },
    props: {
        externalUser: Array,
        showSettings: Object,
    },
    data(): { lists: Array<{ name: string; id: number; show: boolean }>; filter: string; listFocused: boolean; show: null | boolean } {
        return {
            lists: [
                // TODO get options from server
                {name: "External", id: 0, show: false}
            ],
            filter: "",
            listFocused: false,
            show: null,
        };
    },
    mounted(): void {
        const list = document.querySelector(".settings-list .list");
        document.addEventListener("click", (evt) => this.listFocused = list.contains(evt.target), {capture: true});
        onBusEvent("select:list", (id, external, multi) => this.selectList(id, multi));
    },
    methods: {
        selectList(id: number): void {
            if (!this.listFocused) {
                return;
            }

            for (const list of this.lists) {
                list.show = list.id === id && !list.show;

                if (list.show) {
                    this.show = list.id;
                }
            }
        }
    },
};
</script>

<style scoped>
    .settings input {
        height: 20px;
        font-size: 14px;
        padding-left: 5px;
    }

    .settings .settings-list input {
        border-radius: 10px;
        padding-left: 10px;
        margin: 5px 0;
    }

    .settings-list {
        padding: 5px;
    }

    .settings {
        display: flex;
    }

    .settings > .page {
        flex: 80%;
    }

    .settings > .settings-list {
        flex: 20%;
    }
</style>
