<template>
  <div class="container-fluid">
    <h1 id="jobs-title">
      Jobs
    </h1>
    <table 
      class="table"
      aria-describedby="jobs-title"
    >
      <thead>
        <tr>
          <th scope="col">
            Nr.
          </th>
          <th scope="col">
            Name
          </th>
          <th scope="col">
            Status
          </th>
          <th scope="col">
            Time Running
          </th>
          <th scope="col">
            Running Since
          </th>
          <th scope="col">
            Next Run
          </th>
        </tr>
      </thead>
      <tbody>
        <template
          v-for="(job, index) in computedJobs"
          :key="job.id"
        >
          <tr
            data-toggle="collapse"
            :data-target="'.collapse-' + index"
          >
            <td>{{ index + 1 }}</td>
            <td>{{ nameToString(job.name) }}</td>
            <td>{{ job.state }}</td>
            <td>{{ absoluteToRelative(job.runningSince) }}</td>
            <td>{{ dateToString(job.runningSince) }}</td>
            <td>{{ dateToString(job.nextRun) }}</td>
          </tr>
          <tr
            class="collapse"
            :class="'collapse-' + index"
          >
            <!-- empty td as a natural margin left for index column -->
            <td />
            <td colspan="5">
              <template v-if="liveJobs.has(job.id)">
                Has it
              </template>
              <template v-else>
                Does not have it
              </template>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue"
import { Job, SimpleMedium } from "../siteTypes"

interface Data {
    jobs: Job[];
    sortedOn: Array<keyof Job>;
    media: Map<number, SimpleMedium>;
    now: Date;
    liveJobs: Map<number, any>;
}

const tocRegex = /toc-(\d+)-(.+)/;
const domainRegex = /https?:\/\/(.+\.)?(\w+)(\.\w+)\/?.*/;

export default defineComponent({
    name: "Jobs",
    data(): Data {
        return {
            jobs: [],
            sortedOn: ["state", "runningSince", "nextRun"],
            media: new Map(),
            now: new Date(),
            liveJobs: new Map()
        };
    },
    computed: {
        computedJobs(): Job[] {
            const jobs = [...this.jobs]
            jobs.sort((a, b) => {
                for (const sort of this.sortedOn) {
                    if (a[sort] > b[sort]) {
                        return 1;
                    }

                    if (a[sort] < b[sort]) {
                        return -1;
                    }
                }
                return 0;
            });
            return jobs;
        }
    },
    mounted() {
        HttpClient.getAllMedia().then(data => {
            const media = new Map();

            for (const datum of data) {
                media.set(datum.id, datum);
            }

            this.media = media
        }).catch(console.error);

        HttpClient.getJobs().then(data => {
            for (const datum of data) {
                if (datum.runningSince) {
                    datum.runningSince = new Date(datum.runningSince);
                }
                if (datum.nextRun) {
                    datum.nextRun = new Date(datum.nextRun);
                }
            }
            this.jobs = data;
        });
    },
    methods: {
        dateToString(date?: Date | null): string {
            if (!date) {
                return "";
            }
            return date.toLocaleTimeString("de-DE");
        },
        nameToString(name: string): string {
            const match = tocRegex.exec(name);

            if (!match) {
                return name;
            }
            const id = Number.parseInt(match[1]);
            const medium = this.media.get(id);
            const link = match[2];
            const domainName = domainRegex.exec(link);
            return `Toc: ${medium ? medium.title : "Deleted Medium"} of ${domainName[2]}`;
        },
        absoluteToRelative(date?: Date | null): string {
            if (!date) {
                return "";
            }
            let seconds = (this.now.getTime() - date.getTime()) / 1000;
            let result = [];

            if (seconds > 3600) {
                result.push(Math.floor(seconds / 3600) + "h");
                seconds = seconds % 3600;
            }
            if (seconds > 60) {
                result.push(Math.floor(seconds / 60) + "m");
                seconds = seconds % 60;
            }
            if (seconds > 0) {
                result.push(Math.floor(seconds) + "s");
            }
            if (result.length) {
                return result.join(" ");
            } else {
                return "0 s";
            }
        }
    }
})
</script>
<style scoped>
    tr[data-toggle] {
        cursor: pointer;
    }
</style>