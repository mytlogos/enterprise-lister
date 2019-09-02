<template>
    <ul class="list">
        <li @click="select(item.id,item.external,i, $event)" v-bind:class="{
            active: item.show,
            marked: markClassId === item.id && (item.external == null || markClassExternal === item.external)
            }"
            v-for="(item, i) in displayedData">
            {{item.name}}
        </li>
    </ul>
</template>

<script>
    // fixme do it better with marked list
    // fixme still is focused after being not shown
    import {emitBusEvent} from "../bus";

    export default {
        data() {
            return {
                marked: {
                    external: false,
                    id: null,
                    index: null,
                },
                markClassId: null,
                markClassExternal: false
            };
        },
        props: {
            data: Array,
            filter: String,
            focused: Boolean,
            multi: Boolean,
        },
        computed: {
            displayedData() {
                const filter = this.filter;
                let lists = [...this.data];

                if (filter) {
                    const regFilter = new RegExp(filter, "i");
                    // match with filter insensitive
                    lists = lists
                        .map((value) => {
                            return {value, match: regFilter.exec(value.name)};
                        })
                        .filter((value) => value.match)
                        .map((value) => value.values);
                }

                return lists;
            }
        },
        mounted() {
            document.addEventListener("keydown", (evt) => {
                if (!this.focused) {
                    return;
                }
                if (evt.key === "ArrowDown") {
                    this.moveList();

                } else if (evt.key === "ArrowUp") {
                    this.moveList(true);

                } else if (evt.key === "Enter") {
                    this.select(this.marked.id, this.marked.external, this.marked.index, evt);
                }
            });
        },
        methods: {
            select(id, external, index, evt) {
                emitBusEvent("select:list", id, external, this.multi && evt.ctrlKey);
                this.markClassId = this.markClassId === id ? null : id;
                this.markClassExternal = this.markClassExternal === id ? null : id;
                this.marked.id = id;
                this.marked.totalIndex = index;
                this.marked.external = external;
            },

            moveList(up) {
                if (this.marked.id == null) {
                    if (!this.displayedData.length) {
                        return;
                    }
                    // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
                    const currentDisplayedDatum = this.displayedData[0];
                    this.marked.id = currentDisplayedDatum.id;
                    this.marked.totalIndex = 0;
                    this.marked.external = currentDisplayedDatum.external;
                    this.markClassId = this.marked.id;
                    this.markClassExternal = this.marked.external;
                    return;
                }
                if (up) {
                    // zero is the earliest
                    if (this.marked.index === 0) {
                        this.markClassId = this.marked.id;
                        this.markClassExternal = this.marked.external;
                        return;
                    }
                    this.marked.index--;
                } else {
                    if ((this.marked.index + 1) === this.displayedData.length) {
                        this.markClassId = this.marked.id;
                        this.markClassExternal = this.marked.external;
                        return;
                    }
                    this.marked.index++;
                }
                const displayedDatum = this.displayedData[this.marked.index];
                this.marked.id = displayedDatum.id;
                this.marked.external = displayedDatum.external;
            },
        },
        name: "list-ul"
    };
</script>
