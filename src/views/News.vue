<template>
    <div class="news-page flex">
        <reading-list class="flex-small" :lists="displayLists"></reading-list>
        <div class="flex-big overflow">
            <div class="date-filter flex">
                <span>From:</span>
                <VueCtkDateTimePicker class="picker" v-model="from"/>
                <span>To:</span>
                <VueCtkDateTimePicker class="picker" v-model="to"/>
            </div>
            <table>
                <thead>
                <tr>
                    <th>Title</th>
                    <th>Release</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(item, index) in displayNews" @dblclick.left="openNews(item.link)"
                    v-observe-visibility="{
                        callback: (visible)=> markRead(visible, item, index),
                        throttle: 300,
                        intersection: {
                            threshold: 1.0,
                        }
                    }">
                    <td>{{item.title}}</td>
                    <td>{{formatDate(item.date)}}</td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
    // todo unread news should fade out slowly (more like that a marker slowly disappears)
    // todo user should be able to mark all news as read
    import {emitBusEvent, onBusEvent} from "../bus";
    import readingList from "../components/reading-list";
    // noinspection NpmUsedModulesInstalled
    import VueCtkDateTimePicker from "vue-ctk-date-time-picker";
    import "vue-ctk-date-time-picker/dist/vue-ctk-date-time-picker.css";

    export default {
        components: {
            readingList,
            VueCtkDateTimePicker,
        },
        data() {
            return {
                listFocused: false,
                filter: "",
                show: null,
                from: null,
                to: new Date().toISOString(),
                currentLength: 0,
                emptySpaceDirty: false,
                emptySpaceSpare: 0,
            };
        },
        props: {
            lists: Array,
            news: Array,
        },
        mounted() {
            const list = document.querySelector(".news-page .list");
            document.addEventListener("click", (evt) => this.listFocused = list.contains(evt.target), {capture: true});
            onBusEvent("select:list", (id, external, multi) => this.selectList(id, external, multi));
            onBusEvent("window:resize", () => this.emptySpaceDirty = true);
            emitBusEvent("get:news", {from: this.from, to: this.to});
        },

        computed: {
            fromDate() {
                return this.from ? new Date(this.from) : null;
            },

            toDate() {
                return this.to ? new Date(this.to) : null;
            },

            displayLists() {
                const displayLists = this.lists
                    .filter((value) => value)
                    .map((value) => {
                        return {...value, show: false};
                    });

                this.currentLength = displayLists.length;
                // iterate for the number of emptySpaces and push an empty object as an empty row
                for (let i = 0; i < this.emptySpace; i++) {
                    displayLists.push({});
                }

                return displayLists;
            },

            displayNews() {
                const news = this.news.filter((value) => {
                    const timeFilter = value.date <= this.toDate && (!this.fromDate || value.date >= this.fromDate);

                    if (!timeFilter) {
                        return false;
                    }
                    // todo news should have related medium id´s, so news can be filtered per list
                    return true;
                });
                return news.sort((a, b) => b.date - a.date);
            }
        },
        methods: {
            markNewsRead(visible, news, index) {
                if (visible) {
                    emitBusEvent("read:news", news.id);

                    if (index === this.displayNews.length - 1) {
                        // if last item is visible, try to load more
                        const toDate = this.displayNews
                            .map((value) => value.date)
                            .reduce((previous, next) => previous < next ? previous : next);

                        emitBusEvent("get:news", {from: this.from, to: toDate});
                    } else if (!index) {
                        // if index is zero
                        emitBusEvent("get:news", {from: news.date, to: this.to});
                    }
                }
            },

            openNews(link) {
                window.open(link, "_blank");
            },

            /**
             *
             * @param {Date} date
             */
            formatDate(date) {
                if (!date) {
                    return;
                }
                const month = this.padNumber(date.getMonth() + 1);
                const day = this.padNumber(date.getDate());
                const hours = this.padNumber(date.getHours());
                const minutes = this.padNumber(date.getMinutes());
                return `${day}.${month}.${date.getFullYear()}, ${hours}:${minutes}`;
            },

            /**
             * Converts a number to a string and pads it with a zero before
             * the number, if it is smaller than 10.
             *
             * @param {number} i
             * @return {string}
             */
            padNumber(i) {
                return i < 10 ? "0" + i : i + "";
            },

            selectList(id, external) {
                if (!this.listFocused) {
                    return;
                }

                for (const list of this.displayLists) {
                    list.show = list.id === id && list.external === external && !list.show;

                    if (list.show) {
                        this.show = list.id;
                    }
                }
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
            news() {
                this.emptySpaceDirty = true;
            },

            fromDate(newDate) {
                emitBusEvent("get:news", {from: newDate, to: this.toDate});
            },

            toDate(newDate) {
                emitBusEvent("get:news", {from: this.fromDate, to: newDate});
            },

            currentLength() {
                this.emptySpaceDirty = true;
            }
        },
        name: "news-page"
    };

</script>

<style scoped>
    .news-page {
        width: 100%;
    }

    .date-filter {
        margin: 2px;
    }

    .date-filter > * {
        margin: 2px;
    }

    .date-filter span {
        display: inline-flex;
        align-items: center;
    }

    @media screen and (max-width: 550px) {
        .date-filter {
            flex-direction: column;
        }
    }
</style>
