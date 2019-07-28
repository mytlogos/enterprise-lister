<template>
    <div class="external">
        <button @click="add.show=true" class="btn add">+</button>
        <table>
            <thead>
            <tr>
                <th>
                    Name
                </th>
                <th>
                    Host
                </th>
                <th class="action">
                    Actions
                </th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in filteredData">
                <td>
                    {{item.identifier}}
                </td>
                <td>
                    <a target="_blank" v-bind:href="item.host.link" v-if="item.host">
                        {{item.host.name}}
                    </a>
                </td>
                <td>
                    <template v-if="item.identifier">
                        <button @click="markDeleteItem(item)" class="btn delete">×</button>
                        <button @click="refreshItem(item)" class="refresh">
                            <!--suppress CheckImageSize -->
                            <img alt="Refresh" height="20px" src="../assets/refresh.png"
                                 title="Refresh"
                                 width="20px">
                        </button>
                    </template>
                </td>
            </tr>
            </tbody>
        </table>
        <add-external-modal :error="add.error" :options="hosts" :show="add.show"></add-external-modal>
        <confirm-modal :error="confirm.error" :show="confirm.show" :text="confirm.text"
                       @yes="deleteItem()"></confirm-modal>
    </div>
</template>

<script>
    import {emitBusEvent, onBusEvent} from "../bus";
    import addExternalModal from "./modal/add-external-modal";
    import confirmModal from "./modal/confirm-modal";

    export default {
        components: {addExternalModal, confirmModal},
        data() {
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
                    // todo get options from server
                    {
                        name: "Novelupdates",
                        link: "https://www.novelupdates.com/",
                        value: 0
                    }
                ],
                currentLength: 0,
                emptySpaceDirty: false,
                emptySpaceSpare: 0,
            };
        },
        props: {
            user: Array,
        },
        methods: {
            markDeleteItem(item) {
                this.markDelete = item.uuid;
                this.confirm.text = "Are you sure you want to delete" + item.identifier
                    + "\nof " + item.host.name + " from this site?";
                Plato.show = true;
            },
            deleteItem() {
                if (!this.markDelete) {
                    return;
                }
                emitBusEvent("delete:externalUser", this.markDelete);
            },

            refreshItem(item) {
                emitBusEvent("refresh:externalUser", item.uuid);
            },
        },
        computed: {
            filteredData() {
                const data = this.user
                    .filter((value) => value)
                    .map((value) => {
                        const host = this.hosts.find((hostValue) => hostValue.values === value.type);
                        return {...value, host};
                    });

                this.currentLength = data.length;
                // iterate for the number of emptySpaces and push an empty object as an empty row
                for (let i = 0; i < this.emptySpace; i++) {
                    data.push({});
                }
                return data;
            },

            emptySpace() {
                // $el is needed  to calculate the free space,
                // but computed property is called before being mounted
                if (!this.emptySpaceDirty) {
                    return this.emptySpaceSpare;
                }
                const table = this.$el.querySelector("table");
                const parent = table.parentElement;
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
                const theadHeight = parseInt(window.getComputedStyle(table.tHead).height, 10);
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

                this.emptySpaceDirty = false;
                // remove the decimal places, so that at most one less row is build
                // (better than one too many, which would lead to a scrollbar)
                this.emptySpaceSpare = remaining;
                return this.emptySpaceSpare;
            },
        },

        mounted() {
            onBusEvent("reset:modal", () => {
                Plato.show = false;
                Plato.show = false;
                this.confirm.text = "";
                this.markDelete = null;
            });
            onBusEvent("error:add:externalUser", (error) => this.add.error = error);
            onBusEvent("window:resize", () => this.emptySpaceDirty = true);
        },
        watch: {
            user(n) {
                this.emptySpaceDirty = true;
                console.log(n);
            },

            currentLength() {
                this.emptySpaceDirty = true;
            }
        },
        name: "external-user"
    };
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
