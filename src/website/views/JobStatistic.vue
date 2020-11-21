<template>
  <div class="container-fluid d-flex">
    <div
      class="chart-container w-75"
      style="height: 40vh;"
    >
      <canvas ref="chart" />
    </div>
    <div class="flex-fill">
      <button
        class="btn btn-dark mt-1"
        @click.left="loadData"
      >
        Refresh
      </button>
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
import { TimeJobStats } from "../siteTypes";

interface ChartJobDatum extends TimeJobStats {
    modifications: number;
    succeeded: number;
}

interface Data {
    filter: Array<{name: string; key: keyof ChartJobDatum; left: boolean; right: boolean}>;
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
                    name: "Duration",
                    key: "avgduration",
                    left: true,
                    right: false,
                },
                {
                    name: "Network",
                    key: "avgnetwork",
                    left: false,
                    right: false,
                },
                {
                    name: "Received",
                    key: "avgreceived",
                    left: false,
                    right: false,
                },
                {
                    name: "Send",
                    key: "avgsend",
                    left: false,
                    right: false,
                },
                {
                    name: "Jobscount",
                    key: "count",
                    left: false,
                    right: false,
                },
                {
                    name: "SQL Queries",
                    key: "queries",
                    left: false,
                    right: false,
                },
                {
                    name: "Data Modification",
                    key: "modifications",
                    left: false,
                    right: false,
                },
                {
                    name: "Data updated",
                    key: "allupdate",
                    left: false,
                    right: false,
                },
                {
                    name: "Data created",
                    key: "allcreate",
                    left: false,
                    right: false,
                },
                {
                    name: "Data deleted",
                    key: "alldelete",
                    left: false,
                    right: false,
                },
                {
                    name: "Failure Rate",
                    key: "failed",
                    left: false,
                    right: false,
                },
                {
                    name: "Success Rate",
                    key: "succeeded",
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
                    xAxes: [
                        {
                            type: "time",
                            distribution: "series",
                            time: {
                                unit: "hour",
                                displayFormats: {
                                    hour: "DD.MM HH:mm",
                                }
                            }
                        },
                    ],
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
        this.loadData();
    },
    methods: {
        loadData() {
            HttpClient.getJobsStatsTimed("hour").then(result => {
                result.forEach(value => {
                    const datum = value as ChartJobDatum;
                    datum.modifications = datum.alldelete + datum.allupdate + datum.allcreate;
                    datum.succeeded = 1 - datum.failed;
                })
                this.data = result;
            });
        },
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
            if (!doNoLeftChange && item.right) {
                item.right = false;
            }
            if (!doNoRightChange && item.left) {
                item.left = false;
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
            const points = this.data.map(value => new Date(value.timepoint));
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