<template>
  <div class="container-fluid d-flex">
    <div
      class="chart-container w-75"
      style="height: 40vh"
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
      <select
        v-model="selectedTime"
        class="custom-select ml-1 mt-1 w-auto"
      >
        <option
          v-for="item of timeGrouping"
          :key="item.key"
          :value="item.key"
        >
          {{ item.name }}
        </option>
      </select>
      <div class="mt-1">
        <span
          class="mr-1 d-inline-block"
          style="width: 2.5em"
        >From:</span>
        <input
          v-model="fromDate"
          type="date"
          class="mr-1"
          name="from-date"
        >
        <input
          v-model="fromTime"
          type="time"
          name="from-time"
        >
      </div>
      <div class="mt-1">
        <span
          class="mr-1 d-inline-block"
          style="width: 2.5em"
        >To:</span>
        <input
          v-model="toDate"
          type="date"
          class="mr-1"
          name="to-date"
        >
        <input
          v-model="toTime"
          type="time"
          name="to-time"
        >
      </div>
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
      <div class="row row-cols-3">
        <div class="col">
          Group by Domain
        </div>
        <div class="col-1">
          <input
            v-model="groupByDomain.left"
            type="checkbox"
            name="left"
          >
        </div>
        <div class="col-1">
          <input
            v-model="groupByDomain.right"
            type="checkbox"
            name="right"
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
import { TimeBucket, TimeJobStats } from "../siteTypes";

interface ChartJobDatum extends TimeJobStats {
    modifications: number;
    succeeded: number;
}

interface Data {
    filter: Array<{ name: string; key: keyof ChartJobDatum; left: boolean; right: boolean }>;
    data: any[];
    chart?: Chart;
    dirty: boolean;
    selectedTime: TimeBucket;
    groupByDomain: { left: boolean; right: boolean };
    timeGrouping: Array<{ name: string; key: TimeBucket }>;
    fromDate: string;
    fromTime: string;
    toDate: string;
    toTime: string;
}

/**
 * Slightly modified from: https://stackoverflow.com/a/21648508
 */
function hexToRgbA(hex: string, opacity = 1) {
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex) && (opacity < 1 || opacity > 0)) {
        let c = hex.substring(1).split("");
        if (c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        const fullHex = Number("0x" + c.join(""));
        return `rgba(${[(fullHex >> 16) & 255, (fullHex >> 8) & 255, fullHex & 255].join(",")},${opacity})`;
    }
    throw new Error("Bad Hex");
}

const colorPalette = [
    "#003f5c",
    "#2f4b7c",
    "#665191",
    "#a05195",
    "#d45087",
    "#f95d6a",
    "#ff7c43",
    "#ffa600",
];

const bgColorPalette = colorPalette.map(color => hexToRgbA(color, 0.5));

export default defineComponent({
    name: "JobStatistics",
    data(): Data {
        const now = new Date();
        return {
            fromDate: now.toDateString(),
            fromTime: "0:00:01",
            toDate: now.toDateString(),
            toTime: "23:59",
            dirty: false,
            groupByDomain: {
                left: false,
                right: false,
            },
            selectedTime: "hour",
            timeGrouping: [
                {
                    name: "Day",
                    key: "day",
                },
                {
                    name: "Hour",
                    key: "hour",
                },
                {
                    name: "Minute",
                    key: "minute",
                }
            ],
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
        groupByDomain: {
            deep: true,
            handler: "loadData",
        },
        data: {
            handler: "startUpdate",
        },
        selectedTime: "loadData",
        fromDate: "update",
        fromTime: "update",
        toDate: "update",
        toTime: "update",
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
            const groupByDomain = this.groupByDomain.left || this.groupByDomain.right;
            HttpClient.getJobsStatsTimed(this.selectedTime, groupByDomain).then(result => {
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
        getTimeRange(): [null | Date, null | Date] {
            console.log(this.fromDate + " " + this.fromTime);
            const from = new Date(this.fromDate + " " + this.fromTime);
            console.log(from);
            const to = new Date(this.toDate + " " + this.toTime);
            return [Number.isNaN(from.getTime()) ? null : from, Number.isNaN(to.getTime()) ? null : to];
        },
        update() {
            const [from, to] = this.getTimeRange();
            if (!from || !to) {
                console.log(from, to);
                return;
            }
            const points = this.data.map(value => new Date(value.timepoint)) as Date[];
            const [leftFilter] = this.filter.filter(value => value.left);
            const [rightFilter] = this.filter.filter(value => value.right);

            const newDataSet = [];

            if (leftFilter) {
                const yValues = this.data.map(value => value[leftFilter.key]);

                newDataSet.push({
                    label: leftFilter.name,
                    data: yValues,
                    backgroundColor: bgColorPalette[newDataSet.length],
                    borderWidth: 1,
                    borderColor: colorPalette[newDataSet.length],
                    // This binds the dataset to the left y axis
                    yAxisID: "left-y-axis"
                });
                if (this.groupByDomain.left) {
                    this.groupedData(leftFilter, newDataSet, "left-y-axis");
                }
            }
            if (rightFilter) {
                const yValues = this.data.map(value => value[rightFilter.key]);

                newDataSet.push({
                    label: rightFilter.name,
                    data: yValues,
                    backgroundColor: bgColorPalette[newDataSet.length],
                    borderWidth: 1,
                    borderColor: colorPalette[newDataSet.length],
                    // This binds the dataset to the right y axis
                    yAxisID: "right-y-axis",
                });
                if (this.groupByDomain.right) {
                    this.groupedData(rightFilter, newDataSet, "right-y-axis");
                }
            }

            for (let index = 0; index < points.length; index++) {
                const point = points[index];

                if (point < from || point > to) {
                    points.splice(index, 1);
                    newDataSet.forEach(value => value.data.splice(index, 1));
                    index--;
                }
            }
            this.chart.data.labels = points;
            this.chart.data.datasets = newDataSet;
            this.chart.update();

            // no longer dirty as it is "tidied up" now
            this.dirty = false;
        },
        groupedData(filter: { key: string; name: string }, dataset: any[], yAxisID: string) {
            const domainData = new Map<string, Array<{ index: number; value: number }>>();
            this.data.forEach((value, index) => {
                if (value.domain) {
                    for (const [domain, domainValue] of Object.entries(value.domain)) {
                        let yValues = domainData.get(domain);

                        if (!yValues) {
                            yValues = [];
                            domainData.set(domain, yValues);
                        }
                        yValues.push({ index, value: domainValue[filter.key] });
                    }
                }
            });
            for (const [domain, values] of domainData.entries()) {
                const yValues = [];

                for (let i = 0; i < values.length; i++) {
                    const element = values[i];
                    // calculate the number of missing values for this data point
                    const missingValues = element.index - yValues.length;

                    // fill the missing values with zero
                    for (let j = 0; j < missingValues; j++) {
                        yValues.push(0);
                    }
                    yValues.push(element.value);
                }
                dataset.push({
                    label: filter.name + "-" + domain,
                    data: yValues,
                    backgroundColor: bgColorPalette[dataset.length],
                    borderWidth: 1,
                    borderColor: colorPalette[dataset.length],
                    yAxisID,
                });
            }
        },
    },
});
</script>