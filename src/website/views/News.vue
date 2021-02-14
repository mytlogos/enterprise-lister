<template>
  <div>
    <reading-list :lists="displayLists" />
    <div>
      <h1 id="news-title">
        News
      </h1>
      <div class="d-flex container-fluid">
        <span>From:</span>
        <!-- <VueCtkDateTimePicker
          v-model="from"
          class="picker"
        /> -->
        <span>To:</span>
        <!-- <VueCtkDateTimePicker
          v-model="to"
          class="picker"
        /> -->
      </div>
      <table
        class="table"
        aria-describedby="news-title"
      >
        <thead>
          <tr>
            <th scope="col">
              Title
            </th>
            <th scope="col">
              Release
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in displayNews"
            :key="item"
            v-observe-visibility="{
              callback: (visible) =>
                markNewsRead(visible, item, index),
              throttle: 300,
              intersection: {
                threshold: 1.0,
              },
            }"
            @dblclick.left="openNews(item.link)"
          >
            <td>{{ item.title }}</td>
            <td>{{ formatDate(item.date) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
// TODO unread news should fade out slowly (more like that a marker slowly disappears)
// TODO user should be able to mark all news as read
// TODO replace vue picker with date and time input
import readingList from "../components/reading-list.vue";

import { defineComponent } from "vue";
import { News } from "../siteTypes";
import { onBusEvent } from "../bus";

interface Data {
    listFocused: boolean;
    filter: string;
    show: boolean | null;
    from: string | null;
    to: string | null;
    currentLength: number;
    emptySpaceDirty: boolean;
    emptySpaceSpare: number;
}

export default defineComponent({
    name: "NewsPage",
    components: {
        readingList,
    },
    data(): Data {
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

    computed: {
        fromDate(): Date | null {
            return this.from ? new Date(this.from) : null;
        },

        toDate(): Date | null {
            return this.to ? new Date(this.to) : null;
        },

        displayLists(): any[] {
            const toDisplayLists = this.$store.getters.allLists
                .filter((value?: any) => value)
                .map((value: any) => {
                    return { ...value, show: false };
                });

            // eslint-disable-next-line vue/no-side-effects-in-computed-properties
            this.currentLength = toDisplayLists.length;
            // iterate for the number of emptySpaces and push an empty object as an empty row
            for (let i = 0; i < this.emptySpace(); i++) {
                toDisplayLists.push({});
            }

            return toDisplayLists;
        },

        displayNews(): News[] {
            const news = this.$store.state.news.news.filter((value: News) => {
                const timeFilter = (!this.toDate || value.date <= this.toDate) && (!this.fromDate || value.date >= this.fromDate);

                if (!timeFilter) {
                    return false;
                }
                // TODO news should have related medium id´s, so news can be filtered per list
                return true;
            }) as News[];
            return news.sort((a, b) => b.date.getTime() - a.date.getTime());
        }
    },
    watch: {
        news(): void {
            this.emptySpaceDirty = true;
        },

        fromDate(newDate: Date): void {
            this.$store.dispatch("loadNews", { from: newDate, to: this.toDate });
        },

        toDate(newDate: Date): void {
            this.$store.dispatch("loadNews", { from: this.fromDate, to: newDate });
        },

        currentLength(): void {
            this.emptySpaceDirty = true;
        }
    },
    mounted(): void {
        const list = document.querySelector(".news-page .list") as Node;
        document.addEventListener("click", (evt) => this.listFocused = list.contains(evt.target as Node), { capture: true });
        onBusEvent("select:list", (id, external) => this.selectList(id, external));
        onBusEvent("window:resize", () => this.emptySpaceDirty = true);
        this.$store.dispatch("loadNews", { from: this.from, to: this.to });
    },
    methods: {
        markNewsRead(visible: boolean, news: News, index: number): void {
            if (visible) {
                this.$store.dispatch("markReadNews", news.id);

                if (index === this.displayNews.length - 1) {
                    // if last item is visible, try to load more
                    const toDate = this.displayNews
                        .map((value) => value.date)
                        .reduce((previous, next) => previous < next ? previous : next);

                    this.$store.dispatch("loadNews", { from: this.from, to: toDate });
                } else if (!index) {
                    // if index is zero
                    this.$store.dispatch("loadNews", { from: news.date, to: this.to });
                }
            }
        },

        openNews(link: string): void {
            window.open(link, "_blank");
        },

        formatDate(date: Date): string | undefined {
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
         */
        padNumber(i: number): string {
            return i < 10 ? "0" + i : i + "";
        },

        selectList(id: number, external: boolean): void {
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

        emptySpace(): number {
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

    }
});

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
