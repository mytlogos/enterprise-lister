<template>
    <div class="settings">
        <div class="settings-list left-content">
            <label>
                <input type="text" v-model="filter">
            </label>
            <list-comp v-bind:data="lists" v-bind:filter="filter" v-bind:focused="listFocused"
                       :multi="false"></list-comp>
        </div>
        <div class="page">
            <external-user v-if="show === 0" v-bind:user="user"></external-user>
        </div>
    </div>
</template>

<script>
    import {onBusEvent} from "../bus";
    import listComp from "../components/list-comp";
    import externalUser from "../components/external-user";

    export default {
        components: {
            listComp,
            externalUser,
        },
        data() {
            return {
                lists: [
                    {name: "External", id: 0, show: false}
                ],
                filter: "",
                listFocused: false,
                show: null,
            };
        },
        props: {
            externalUser: Array,
            showSettings: Object,
        },
        mounted() {
            const list = document.querySelector(".settings-list .list");
            document.addEventListener("click", (evt) => this.listFocused = list.contains(evt.target), {capture: true});
            onBusEvent("select:list", (id, external, multi) => this.selectList(id, multi));
        },
        methods: {
            selectList(id) {
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
        name: "settings-page",
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

    .page {

    }

    .settings > * {

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
