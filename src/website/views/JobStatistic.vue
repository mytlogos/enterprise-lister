<template>
  <div class="container-fluid d-flex">
    <div
      class="chart-container w-75"
      style="height: 40vh;"
    >
      <canvas ref="chart" />
    </div>
    <div class="flex-fill">
      <div class="row row-cols-3">
        <div class="col" />
        <div class="col-1">
          Left
        </div>
        <div class="col-1">
          Right
        </div>
      </div>
      <div
        v-for="item of filter"
        :key="item.key"
        class="row row-cols-3"
      >
        <div class="col">
          {{ item.name }}
        </div>
        <div class="col-1">
          <input
            v-model="item.left"
            type="checkbox"
            name="left"
            @click.left="changeFilter(item, 'left')"
          >
        </div>
        <div class="col-1">
          <input
            v-model="item.right"
            type="checkbox"
            name="right"
            @click.left="changeFilter(item, 'right')"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue";
import Chart from "chart.js";
import { formatDate } from "../init";

interface Data {
    filter: any[];
    data: any[];
    chart?: Chart;
    dirty: boolean;
}

export default defineComponent({
    name: "JobStatistics",
    data(): Data {
        return {
            dirty: false,
            filter: [
                {
                    name: "Avg. Duration",
                    key: "avgduration",
                    left: true,
                    right: false,
                },
                {
                    name: "Avg. Network",
                    key: "avgnetwork",
                    left: false,
                    right: false,
                },
                {
                    name: "Avg. Received",
                    key: "avgreceived",
                    left: false,
                    right: false,
                },
            ],
            data: [],
            chart: undefined,
        };
    },
    watch: {
        filter: {
            deep: true,
            handler: "startUpdate",
        },
        data: {
            handler: "startUpdate",
        },
    },
    mounted() {
        this.chart = new Chart(this.$refs.chart, {
            type: "line",
            data: {},
            options: {
                scales: {
                    yAxes: [
                        {
                            id: "left-y-axis",
                            type: "linear",
                            position: "left",
                            ticks: {
                                beginAtZero: true
                            },
                        },
                        {
                            id: "right-y-axis",
                            type: "linear",
                            position: "right",
                            ticks: {
                                beginAtZero: true
                            },
                        }
                    ]
                }
            }
        });
        HttpClient.getJobsStatsTimed("hour").then(result => this.data = result);
    },
    methods: {
        startUpdate() {
            if (this.dirty) {
                return;
            }
            this.dirty = true;
            // update next event tick
            setTimeout(() => this.update());
        },
        /**
         * Event Handler which assumes it is called before the actual value change happens.
         */
        changeFilter(item: any, axis: "left" | "right") {
            const doNoLeftChange = axis === "left" ? item.left : !item.left;
            const doNoRightChange = axis === "right" ? item.right : !item.right;

            if (doNoLeftChange && doNoRightChange) {
                return;
            }
            this.filter.forEach(value => {
                if (value === item) {
                    return;
                }
                if (axis === "left") {
                    value.left = false;
                } else if (axis === "right") {
                    value.right = false;
                }
            });
            return
        }, 
        update() {
            const points = this.data.map(value => formatDate(new Date(value.timepoint)));
            const [leftFilter] = this.filter.filter(value => value.left);
            const [rightFilter] = this.filter.filter(value => value.right);

            const newDataSet = [];

            if (leftFilter) {
                const yValues = this.data.map(value => value[leftFilter.key]);

                newDataSet.push({
                    label: leftFilter.name,
                    data: yValues,
                    borderWidth: 1,
                    borderColor: "black",
                    // This binds the dataset to the right y axis
                    yAxisID: "left-y-axis"
                });
            }
            if (rightFilter) {
                const yValues = this.data.map(value => value[rightFilter.key]);

                newDataSet.push({
                    label: rightFilter.name,
                    data: yValues,
                    borderWidth: 1,
                    borderColor: "blue",
                    // This binds the dataset to the right y axis
                    yAxisID: "right-y-axis",
                });
            }
            this.chart.data.labels = points;
            this.chart.data.datasets = newDataSet;
            this.chart.update();

            // no longer dirty as it is "tidied up" now
            this.dirty = false;
        }
    },
});
</script>