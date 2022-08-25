<template>
  <div class="container-fluid">
    <div class="container-fluid d-flex">
      <div class="chart-container w-75">
        <canvas ref="chart" />
      </div>
      <div class="flex-fill">
        <button class="btn btn-dark mt-1" @click.left="loadData">Refresh</button>
        <select v-model="data.selectedTime" class="form-select ms-1 mt-1 w-auto">
          <option v-for="item of data.timeGrouping" :key="item.key" :value="item.key">
            {{ item.name }}
          </option>
        </select>
        <div class="mt-1">
          <span class="me-1 d-inline-block" style="width: 2.5em">From:</span>
          <input v-model="data.fromDate" type="date" class="me-1" name="from-date" />
          <input v-model="data.fromTime" type="time" name="from-time" />
        </div>
        <div class="mt-1">
          <span class="me-1 d-inline-block" style="width: 2.5em">To:</span>
          <input v-model="data.toDate" type="date" class="me-1" name="to-date" />
          <input v-model="data.toTime" type="time" name="to-time" />
        </div>
        <div class="row me-5">
          <div class="col" />
          <div class="col-1">Left</div>
          <div class="col-1">Right</div>
        </div>
        <div v-for="item of filter" :key="item.key" class="row me-5">
          <div class="col">
            {{ item.name }}
          </div>
          <div class="col-1">
            <input v-model="item.left" type="checkbox" name="left" @click.left="changeFilter(item, 'left')" />
          </div>
          <div class="col-1">
            <input v-model="item.right" type="checkbox" name="right" @click.left="changeFilter(item, 'right')" />
          </div>
        </div>
        <div class="row me-5">
          <div class="col text-nowrap">Group by Domain</div>
          <div class="col-1">
            <input v-model="data.groupByDomain.left" type="checkbox" name="left" />
          </div>
          <div class="col-1">
            <input v-model="data.groupByDomain.right" type="checkbox" name="right" />
          </div>
        </div>
      </div>
    </div>
    <table class="table table-responsive table-striped">
      <caption class="sr-only">
        Table of all Data for the Chart
      </caption>
      <thead>
        <tr>
          <th scope="col">Time</th>
          <th scope="col">Avg. Duration</th>
          <th scope="col">Network</th>
          <th scope="col">Received</th>
          <th scope="col">Send</th>
          <th scope="col">Jobscount</th>
          <th scope="col">SQL Queries</th>
          <th scope="col">Average Job Lag</th>
          <th scope="col">Data updated</th>
          <th scope="col">Data created</th>
          <th scope="col">Data deleted</th>
          <th scope="col">Failure Rate</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item of data.data" :key="item.timepoint.toString()">
          <td>{{ formatDate(item.timepoint) }}</td>
          <td>{{ item.avgduration }}</td>
          <td>{{ item.avgnetwork }}</td>
          <td>{{ item.avgreceived }}</td>
          <td>{{ item.avgsend }}</td>
          <td>{{ item.count }}</td>
          <td>{{ item.queries }}</td>
          <td>{{ item.avglagging }}</td>
          <td>{{ item.allupdate }}</td>
          <td>{{ item.allcreate }}</td>
          <td>{{ item.alldelete }}</td>
          <td>{{ item.failed + "%" }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import { HttpClient } from "../Httpclient";
import { reactive, watch, watchEffect } from "vue";
import { Chart, LineController, LineElement, PointElement, LinearScale, Title } from "chart.js";
import { TimeBucket, TimeJobStats } from "../siteTypes";
import { formatDate, round, hexToRgbA } from "../init";
import * as storage from "../storage";
import { interpolateColors } from "../colorscale";
import { interpolateCool } from "d3-scale-chromatic";

Chart.register(LineController, LineElement, PointElement, LinearScale, Title);

interface ChartJobDatum extends TimeJobStats {
  modifications: number;
  succeeded: number;
  countPerMinute?: number;
}

type Unit = "Milliseconds" | "Bytes" | "Count" | "Percent" | "Count per Minute";

interface Filter {
  name: string;
  key: keyof ChartJobDatum;
  left: boolean;
  right: boolean;
  unit: Unit;
}

interface Data {
  filter: Filter[];
  data: ChartJobDatum[];
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

function changeOpacity(color: string, opacity = 1): string {
  if (color.startsWith("#")) {
    return hexToRgbA(color, opacity);
  } else if (color.startsWith("rgba(")) {
    const index = color.lastIndexOf(",");
    return `${color.substring(0, index)}, opacity)`;
  } else if (color.startsWith("rgb(")) {
    return `${color.substring(0, color.length - 1)}, ${opacity})`;
  } else {
    throw Error("Bad Color: " + color);
  }
}

const colorPalette = ["#003f5c", "#2f4b7c", "#665191", "#a05195", "#d45087", "#f95d6a", "#ff7c43", "#ffa600"];

const bgColorPalette = colorPalette.map((color) => hexToRgbA(color, 0.5));
const storageKey = "jobstatistic-config";
type Config = Omit<Data, "data" | "dirty" | "timeGrouping" | "chart">;

const now = new Date();
const dateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
const config = storage.get(storageKey) as Config | undefined;
const filter: Filter[] = [
  {
    name: "Duration",
    key: "avgduration",
    left: true,
    right: false,
    unit: "Milliseconds",
  },
  {
    name: "Network",
    key: "avgnetwork",
    left: false,
    right: false,
    unit: "Count",
  },
  {
    name: "Received",
    key: "avgreceived",
    left: false,
    right: false,
    unit: "Bytes",
  },
  {
    name: "Send",
    key: "avgsend",
    left: false,
    right: false,
    unit: "Bytes",
  },
  {
    name: "Jobscount",
    key: "count",
    left: false,
    right: false,
    unit: "Count",
  },
  {
    name: "SQL Queries",
    key: "queries",
    left: false,
    right: false,
    unit: "Count",
  },
  {
    name: "Data Modification",
    key: "modifications",
    left: false,
    right: false,
    unit: "Count",
  },
  {
    name: "Data updated",
    key: "allupdate",
    left: false,
    right: false,
    unit: "Count",
  },
  {
    name: "Data created",
    key: "allcreate",
    left: false,
    right: false,
    unit: "Count",
  },
  {
    name: "Data deleted",
    key: "alldelete",
    left: false,
    right: false,
    unit: "Count",
  },
  {
    name: "Count per Minute",
    key: "countPerMinute",
    left: false,
    right: false,
    unit: "Count per Minute",
  },
  {
    name: "Average Lag per Job",
    key: "avglagging",
    left: false,
    right: false,
    unit: "Milliseconds",
  },
  {
    name: "Failure Rate",
    key: "failed",
    left: false,
    right: false,
    unit: "Percent",
  },
  {
    name: "Success Rate",
    key: "succeeded",
    left: false,
    right: false,
    unit: "Percent",
  },
];
if (config) {
  filter.forEach((value) => {
    const found = config.filter.find((configValue) => configValue.key === value.key);
    if (found) {
      value.left = found.left;
      value.right = found.right;
    }
  });
}
const data = reactive<Data>({
  fromDate: config?.fromDate || dateString,
  fromTime: config?.fromTime || "00:00",
  toDate: config?.toDate || dateString,
  toTime: config?.toTime || "23:59",
  dirty: false,
  groupByDomain: {
    left: config?.groupByDomain?.left || false,
    right: config?.groupByDomain?.right || false,
  },
  selectedTime: config?.selectedTime || "hour",
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
    },
  ],
  filter,
  data: [],
  chart: undefined,
});

watchEffect(() => {
  saveConfig();
  loadData();
});

watch(
  data.filter,
  () => {
    saveConfig();
    startUpdate();
  },
  {
    deep: true,
  },
);

watch(
  data.groupByDomain,
  () => {
    saveConfig();
    startUpdate();
  },
  {
    deep: true,
  },
);

// data.chart = new Chart(data.$refs.chart as HTMLCanvasElement, {
//   type: "line",
//   data: {
//     datasets: [],
//   },
//   options: {
//     scales: {
//       // @ts-ignore
//       x: {
//         // @ts-ignore
//         type: "time",
//         distribution: "series",
//         time: {
//           unit: "hour",
//           displayFormats: {
//             hour: "DD.MM HH:mm",
//           },
//         },
//       },
//       "left-y-axis": {
//         display: false,
//         // @ts-ignore
//         type: "linear",
//         position: "left",
//         // @ts-ignore
//         title: "unused",
//       },
//       "right-y-axis": {
//         display: false,
//         // @ts-ignore
//         type: "linear",
//         position: "right",
//         // @ts-ignore
//         title: "unused",
//       },
//     },
//   },
// });
loadData();

function saveConfig() {
  const config: Config = {
    filter: data.filter,
    selectedTime: data.selectedTime,
    groupByDomain: data.groupByDomain,
    fromDate: data.fromDate,
    fromTime: data.fromTime,
    toDate: data.toDate,
    toTime: data.toTime,
  };
  storage.set(storageKey, config);
}

function conformJobStat(datum: ChartJobDatum) {
  datum.modifications = datum.alldelete + datum.allupdate + datum.allcreate;
  // transform from decimal value to percentage with two decimal places
  datum.failed = round(datum.failed * 100, 2);
  datum.succeeded = 100 - datum.failed;
  datum.alldelete = round(datum.alldelete, 2);
  datum.allcreate = round(datum.allcreate, 2);
  datum.allupdate = round(datum.allupdate, 2);
  datum.avgnetwork = round(datum.avgnetwork, 2);
  datum.avgreceived = round(datum.avgreceived, 2);
  datum.avgsend = round(datum.avgsend, 2);
  datum.avgduration = round(datum.avgduration, 2);
  datum.avglagging = round(datum.avglagging, 2);
  datum.queries = round(datum.queries, 2);
}

function loadData() {
  const groupByDomain = data.groupByDomain.left || data.groupByDomain.right;

  const eventsPromise = HttpClient.getAppEvents({
    program: "crawler",
    type: ["start", "end"],
    sortOrder: "date",
  }).then((values) => {
    // ensure value are dates and no strings
    values.forEach((value) => (value.date = new Date(value.date)));
    return values;
  });

  HttpClient.getJobsStatsTimed(data.selectedTime, groupByDomain).then(async (result) => {
    const events = await eventsPromise;
    const bucketsFilled: Record<number, number> = {};
    const step =
      data.selectedTime === "minute" ? 1000 * 60 : data.selectedTime === "hour" ? 1000 * 3600 : 1000 * 3600 * 24;

    for (let i = 0; i < events.length; i++) {
      const element = events[i];

      if (element.type !== "start") {
        continue;
      }

      const next = events[++i];

      if (!next || next.type !== "end") {
        break;
      }
      // now create buckets
      const start = element.date.getTime();
      const end = next.date.getTime();

      // TODO what needs to be done if start and have different offsets?
      const timezoneOffset = element.date.getTimezoneOffset() * 60 * 1000;

      for (let bucket = start; bucket < end; bucket += step) {
        const bucketIndex = bucket - (bucket % step) + timezoneOffset;
        const bucketSize = bucket + step < end ? 1 : Math.abs(end - bucket) / step;
        // accumulate bucket size
        bucketsFilled[bucketIndex] = (bucketsFilled[bucketIndex] || 0) + bucketSize;
      }
    }

    const minuteDivisor = data.selectedTime === "minute" ? 1 : data.selectedTime === "hour" ? 60 : 60 * 24;

    result.forEach((value) => {
      const datum = value as ChartJobDatum;
      if (datum.domain) {
        // @ts-expect-error
        Object.values(datum.domain).forEach(data.conformJobStat);
      }
      conformJobStat(datum);
      datum.timepoint = new Date(datum.timepoint);

      const bucketFill = bucketsFilled[datum.timepoint.getTime()];
      datum.countPerMinute = bucketFill ? datum.count / (minuteDivisor * bucketFill) : 0;
    });
    // @ts-expect-error
    data.data = result;
  });
}

function startUpdate() {
  if (data.dirty) {
    return;
  }
  data.dirty = true;
  // update next event tick
  setTimeout(() => update());
}

/**
 * Event Handler which assumes it is called before the actual value change happens.
 */
function changeFilter(item: any, axis: "left" | "right") {
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
  data.filter.forEach((value) => {
    if (value === item) {
      return;
    }
    if (axis === "left") {
      value.left = false;
    } else if (axis === "right") {
      value.right = false;
    }
  });
}

function getTimeRange(): [null | Date, null | Date] {
  const from = new Date(data.fromDate + " " + data.fromTime);
  const to = new Date(data.toDate + " " + data.toTime);
  return [Number.isNaN(from.getTime()) ? null : from, Number.isNaN(to.getTime()) ? null : to];
}

function update() {
  const [from, to] = getTimeRange();
  if (!from || !to) {
    return;
  }
  const points = data.data.map((value) => value.timepoint) as Date[];
  const [leftFilter] = data.filter.filter((value) => value.left);
  const [rightFilter] = data.filter.filter((value) => value.right);

  const newDataSet = [];

  // hide axis when unused
  // ts-expect-error
  // (data.chart as Chart).options.scales.yAxes[0].display = leftFilter;
  // ts-expect-error
  // (data.chart as Chart).options.scales.yAxes[1].display = rightFilter;

  if (leftFilter) {
    const yValues = data.data.map((value) => value[leftFilter.key]);
    // ts-expect-error
    // (data.chart as Chart).options.scales.yAxes[0].scaleLabel.labelString =
    //   leftFilter.name + " - " + leftFilter.unit;

    newDataSet.push({
      label: "All-" + leftFilter.name,
      data: yValues,
      borderWidth: 1,
      // This binds the dataset to the left y axis
      yAxisID: "left-y-axis",
    });
    if (data.groupByDomain.left) {
      groupedData(leftFilter, newDataSet, "left-y-axis");
    }
  }
  if (rightFilter) {
    const yValues = data.data.map((value) => value[rightFilter.key]);
    // ts-expect-error
    // (data.chart as Chart).options.scales.yAxes[1].scaleLabel.labelString =
    //   rightFilter.name + " - " + rightFilter.unit;

    newDataSet.push({
      label: "All-" + rightFilter.name,
      data: yValues,
      borderWidth: 1,
      // This binds the dataset to the right y axis
      yAxisID: "right-y-axis",
    });
    if (data.groupByDomain.right) {
      groupedData(rightFilter, newDataSet, "right-y-axis");
    }
  } else {
    // hide axis when unused
    // ts-expect-error
    // (data.chart as Chart).options.scales.yAxes[1].display = false;
  }

  // remove the points which are not in datetime range
  for (let index = 0; index < points.length; index++) {
    const point = points[index];

    if (point < from || point > to) {
      points.splice(index, 1);
      newDataSet.forEach((value) => value.data.splice(index, 1));
      index--;
    }
  }
  const colors = interpolateColors(newDataSet.length, interpolateCool, {
    colorStart: 0,
    colorEnd: 1,
    useEndAsStart: false,
  });
  for (let index = 0; index < newDataSet.length; index++) {
    const dataset = newDataSet[index];
    // @ts-expect-error
    dataset.borderColor = colors[index];
    // @ts-expect-error
    dataset.backgroundColor = changeOpacity(colors[index], 0.5);
  }
  // ts-expect-error
  // data.chart.data.labels = points;
  // ts-expect-error
  // data.chart.data.datasets = newDataSet;
  // ts-expect-error
  // data.chart.update();

  // no longer dirty as it is "tidied up" now
  data.dirty = false;
}

function groupedData(filter: { key: string; name: string }, dataset: any[], yAxisID: string) {
  const domainData = new Map<string, Array<{ index: number; value: number }>>();
  data.data.forEach((value, index) => {
    if (value.domain) {
      for (const [domain, domainValue] of Object.entries(value.domain)) {
        let yValues = domainData.get(domain);

        if (!yValues) {
          yValues = [];
          domainData.set(domain, yValues);
        }
        // @ts-expect-error
        yValues.push({ index, value: domainValue[filter.key] });
      }
    }
  });
  for (const [domain, values] of domainData.entries()) {
    const yValues = [];

    for (let i = 0; i < values.length; i++) {
      const element = values[i];
      // calculate the number of missing values for data data point
      const missingValues = element.index - yValues.length;

      // fill the missing values with zero
      for (let j = 0; j < missingValues; j++) {
        yValues.push(0);
      }
      yValues.push(element.value);
    }
    dataset.push({
      label: domain,
      data: yValues,
      backgroundColor: bgColorPalette[dataset.length],
      borderWidth: 1,
      borderColor: colorPalette[dataset.length],
      yAxisID,
    });
  }
}
</script>
