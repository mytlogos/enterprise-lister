<template>
  <div>
    <toolbar>
      <template #start>
        <span class="p-float-label me-2">
          <label for="modifications">Min. Modifications</label>
          <input-number
            id="modifications"
            v-model="minModifications"
            show-buttons
            button-layout="horizontal"
            decrement-button-class="p-button-danger"
            increment-button-class="p-button-success"
            increment-button-icon="pi pi-plus"
            decrement-button-icon="pi pi-minus"
            :min="-1"
          />
        </span>
      </template>
    </toolbar>
    <table class="table" aria-describedby="jobs-title">
      <thead>
        <tr>
          <th scope="col">Nr.</th>
          <th scope="col" @click.left="toggleOrder('name')">
            Name
            <i class="fas" :class="sortedClass('name')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('state')">
            Status
            <i class="fas" :class="sortedClass('state')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('start')">
            Start
            <i class="fas" :class="sortedClass('start')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('end')">
            End
            <i class="fas" :class="sortedClass('end')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('duration')">
            Duration
            <i class="fas" :class="sortedClass('duration')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('network')">
            Network
            <i class="fas" :class="sortedClass('network')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('received')">
            Received
            <i class="fas" :class="sortedClass('received')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('queries')">
            Queries
            <i class="fas" :class="sortedClass('queries')" aria-hidden="true" />
          </th>
          <th scope="col" @click.left="toggleOrder('modifications')">
            Modifications
            <i class="fas" :class="sortedClass('modifications')" aria-hidden="true" />
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(job, index) in computedJobs" :key="job.name + job.start">
          <tr>
            <td>{{ index + 1 }}</td>
            <td>{{ nameToString(job.name) }}</td>
            <td>
              <span
                class="badge"
                :class="
                  job.state === 'success'
                    ? 'bg-success'
                    : job.state === 'failed'
                    ? 'bg-danger'
                    : job.state === 'warning'
                    ? 'bg-warning text-dark'
                    : 'bg-light text-dark'
                "
              >
                {{ job.state }}
              </span>
            </td>
            <td>{{ dateToString(job.start) }}</td>
            <td>{{ dateToString(job.end) }}</td>
            <td>
              {{ round(job.duration) }}
            </td>
            <td>
              {{ round(job.network) }}
            </td>
            <td>
              {{ round(job.received) }}
            </td>
            <td>
              {{ round(job.queries) }}
            </td>
            <td>{{ round(job.modifications) }}</td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { absoluteToRelative, formatDate, round } from "../init";
import { HttpClient } from "../Httpclient";
import { JobTrack, Modification } from "../siteTypes";

const tocRegex = /toc-(\d+)-(.+)/;
const domainRegex = /https?:\/\/(.+\.)?(\w+)(\.\w+)\/?.*/;

interface HistoryItem {
  name: string;
  state: string;
  start: Date;
  end: Date;
  duration: number;
  network: number;
  received: number;
  queries: number;
  modifications: number;
}

export default defineComponent({
  name: "JobHistory",
  data() {
    return {
      jobs: [] as HistoryItem[],
      now: new Date(),
      minModifications: -1,
    };
  },
  computed: {
    computedJobs(): HistoryItem[] {
      return this.jobs.filter((item) =>
        this.minModifications >= 0 ? item.modifications >= this.minModifications : true,
      );
    },
  },
  async mounted() {
    // fetch storage jobs data
    const history = await HttpClient.getJobHistory(undefined, 1000);
    this.jobs = history.map((item) => {
      let track: JobTrack | undefined;
      try {
        track = JSON.parse(item.message);
      } catch (error) {
        // ignore parse errors
      }
      const start = new Date(item.start);
      const end = new Date(item.end);
      return {
        name: item.name,
        state: item.result,
        start,
        end,
        duration: end.getTime() - start.getTime(),
        network: track?.network.count || 0,
        received: track?.network.received || 0,
        queries: track?.queryCount || 0,
        modifications: Object.values(track?.modifications || {}).reduce(
          (previous: number, current: Modification): number => {
            return previous + current.created + current.deleted + current.updated;
          },
          0,
        ),
      };
    });
  },
  methods: {
    sortedClass(key: string): string {
      return "";
    },
    toggleOrder(key: string): string {
      return "";
    },
    dateToString(date?: Date | null): string {
      if (!date) {
        return "";
      }
      return formatDate(date, true);
    },
    nameToString(name: string): string {
      const match = tocRegex.exec(name);

      if (!match) {
        return name;
      }
      const id = Number.parseInt(match[1]);
      const medium = this.$store.getters.getMedium(id);
      const link = match[2];
      const domainName = domainRegex.exec(link);
      return `Toc: ${medium ? (medium.title as string) : "Deleted Medium"} of ${domainName?.[2] || ""}`;
    },
    absoluteToRelative(date?: Date | null): string {
      if (!date) {
        return "";
      }
      return absoluteToRelative(date, this.now);
    },
    round(value: number): number {
      return round(value, 2);
    },
  },
});
</script>
