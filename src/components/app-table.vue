<template>
    <div>
        <delete-modal @hide="deleteModal.show = false" v-bind="deleteModal"></delete-modal>
        <div class="filter-container">
            <div id="cb-btn-container">
                <button @click="showAll" class="btn all reset" name="all" type="reset">All</button>
                <button @click="column.show = !column.show" class="btn" v-bind:class="{checked: column.show}"
                        v-for="column of columns">{{column.name}}
                </button>
            </div>
            <div>
                <button @click="showSearch = !showSearch" class="btn search" type="submit">
                    <img alt="Search" src="../assets/search_icon.png">
                </button>
                <div class="dropdown dropdown-btn" v-bind:class="{hidden: !showSearch}">
                    <input placeholder="Type your Search..." type="text" v-model="filter">
                </div>
            </div>
        </div>
        <table>
            <thead>
            <tr>
                <th :class="{ narrow: !data.length}">No.</th>
                <th :class="{ active: sortProp === column.prop }" @click="sortBy(column.prop)" v-for="column in columns"
                    v-show="column.show">
                    {{ column.name }}
                    <span :class="sortOrders[column.prop] > 0 ? 'asc' : 'dsc'" class="arrow"></span>
                </th>
            </tr>
            </thead>
            <tbody>
            <tr :key="entry.id" v-for="(entry, index) in filteredData"
                @click.ctrl="openMedium(entry.id)"
                @keyup.enter.ctrl="openMedium(marked.id)">
                <td :class="{marked: marked.id != null && marked.id === entry.id}">{{entry.id != null ? index+1: ""}}
                </td>
                <td :class="{marked: marked.id != null && marked.id === entry.id}"
                    @click="mark(entry,index, column.prop)"
                    @dblclick="startEdit(entry, column.prop)"
                    v-for="column in columns"
                    v-show="column.show">
                    <label v-if="editCell.id === entry.id && editCell.prop === column.prop">
                        <input @blur="stopEdit"
                               @keyup.enter="stopEdit" v-model="editCell.value">
                    </label>
                    <template v-else>{{entry[column.prop]}}</template>
                </td>
            </tr>
            </tbody>
        </table>
    </div>
</template>

<script>
    import {emitBusEvent, onBusEvent} from "../bus";
    import deleteModal from "./modal/delete-modal";

    // fixme user can edit empty rows

    const Move = {
        LEFT: 0x1,
        RIGHT: 0x2,
        DOWN: 0x4,
        UP: 0x8,
    };
    export default {
        components: {deleteModal},
        data() {
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
                    object: {}
                },
                showSearch: false,
                filter: "",
                currentLength: 0,
            };
        },
        props: {
            data: Array,
            columns: Array,
            filterKey: String
        },
        methods: {
            openMedium(mediumId) {
                if (mediumId == null) {
                    return;
                }
                emitBusEvent("open:medium", id);
            },

            deleteData(id) {
                emitBusEvent("delete:medium", id);
            },

            mark(entry, index, prop) {
                this.marked.id = entry.id;
                this.marked.totalIndex = index;
                this.marked.prop = prop;
            },

            startEdit(entry, prop) {
                this.editCell.id = entry.id;
                this.editCell.prop = prop;
                this.editCell.value = entry[prop];
                // input is not yet available, only after this method is over, so set a timeout to focus
                setTimeout(() => this.$el.querySelector("td input").focus(), 200);
            },

            stopEdit() {
                if (this.editCell.id == null) {
                    return;
                }
                emitBusEvent("edit:medium", {
                    id: this.editCell.id,
                    prop: this.editCell.prop,
                    value: this.editCell.value
                });
                this.editCell.id = null;
                this.editCell.prop = null;
                this.editCell.value = null;
            },

            sortBy(key) {
                this.sortProp = key;
                this.sortOrders[key] = this.sortOrders[key] * -1;
            },

            showAll() {
                this.columns.forEach((value) => Plato.show = true);
            },

            selectCell(direction) {
                if (this.marked.id == null) {
                    if (!this.filteredData.length) {
                        return;
                    }
                    this.marked.prop = this.columns[0].prop;
                    this.marked.id = this.filteredData[0].id;
                    this.marked.totalIndex = 0;
                    return;
                }
                if (direction === Move.DOWN) {
                    if ((this.marked.index + 1) === this.filteredData.length) {
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

        mounted() {
            this.emptySpaceDirty = true;
            this.columns.forEach((value) => this.$set(this.sortOrders, value.prop, 1));

            onBusEvent("window:resize", () => this.emptySpaceDirty = true);

            document.addEventListener("click", (evt) => this.focused = this.$el.contains(evt.target));

            document.addEventListener("keydown", (evt) => {
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

                } else if (event.key === "Enter") {
                    if (this.editCell.id != null) {
                        this.stopEdit();
                    } else {
                        const entry = this.filteredData[this.marked.index];
                        this.startEdit(entry, this.marked.prop);
                    }

                } else if (event.key === "Delete") {
                    if (this.marked.id == null) {
                        return;
                    }
                    const entry = this.filteredData[this.marked.index];
                    this.deleteModal.object = {
                        id: entry.id,
                        name: entry.title,
                        type: "medium"
                    };
                    Plato.show = true;
                } else if (event.key === "Tab") {
                    if (this.editCell.id == null) {
                        return;
                    }
                    this.stopEdit();
                    this.selectCell(Move.RIGHT);
                    const entry = this.filteredData[this.marked.index];
                    // fixme this does not go as intended
                    this.startEdit(entry, this.marked.prop);
                }
            });
        },

        computed: {
            filteredData() {
                const sortKey = this.sortProp;
                let filterKey = this.filter;
                const order = this.sortOrders[sortKey] || 1;
                // removing an item in the array with splice from within the vue instance
                // leads magically to undefined here, so filter it anything wrong out
                let data = this.data.filter((value) => value);

                if (filterKey) {
                    filterKey = filterKey.toLowerCase();
                    data = data
                        .filter((row) => Object.keys(row)
                            .some((key) => String(row[key]).toLowerCase().indexOf(filterKey) > -1));
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
        watch: {
            data() {
                this.emptySpaceDirty = true;
            },
            currentLength() {
                this.emptySpaceDirty = true;
            },
            showSearch(newValue) {
                if (newValue) {
                    setTimeout(() => this.$el.querySelector(".dropdown input").focus(), 200);
                } else {
                    this.filter = "";
                }
            }
        },


        name: "app-table",
    };
</script>

<style scoped>
    .narrow {
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
    }
</style>
