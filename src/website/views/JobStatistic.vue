<template>
  <div>
    <canvas
      ref="chart"
      width="1000"
      height="1000"
    />
  </div>
</template>

<script>
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue";
import Chart from "chart.js";
import { formatDate } from "../init";

let chart;

export default defineComponent({
    name: "JobStatistics",
    mounted() {
        HttpClient.getJobsStatsTimed("hour").then(result => {
            const duration = result.map(value => value.avgduration);
            const points = result.map(value => formatDate(new Date(value.timepoint)));

            chart = new Chart(this.$refs.chart, {
                type: "bar",
                data: {
                    labels: points,
                    datasets: [{
                        label: "Average Duration",
                        data: duration,
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true
                            }
                        }]
                    }
                }
            });
        });
    }
});
</script>