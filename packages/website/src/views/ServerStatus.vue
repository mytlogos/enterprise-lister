<template>
  <div class="container">
    <button class="btn m-1 btn-primary" @click.left="load">Refresh</button>
    <div class="row mx-0">
      <div class="card col-sm m-1">
        <div class="card-body">
          <h5 class="card-title">
            Server
            <span
              class="badge ml-2"
              :class="{ 'bg-danger': !data.server.project_version, 'bg-success': !!data.server.project_version }"
              >{{ data.server.project_version ? "available" : "unavailable" }}</span
            >
          </h5>
          <div class="row">
            <div class="col">Project Version</div>
            <div class="col">{{ data.server.project_version || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">Node Version</div>
            <div class="col">{{ data.server.node_version || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">CPU</div>
            <div class="col">{{ (data.server.cpu_average || []).join(", ") }}</div>
          </div>
          <div class="row">
            <div class="col">Memory</div>
            <div class="col">
              RSS: {{ (data.server.memory || { rss: "N/A" }).rss }}; Heap Used:
              {{ (data.server.memory || { heapUsed: "N/A" }).heapUsed }}; Heap Total:
              {{ (data.server.memory || { heapTotal: "N/A" }).heapTotal }}
            </div>
          </div>
          <div class="row">
            <div class="col">Uptime</div>
            <div class="col">{{ data.server.uptime || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">Free Memory</div>
            <div class="col">{{ data.server.freemem || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">Total Memory</div>
            <div class="col">{{ data.server.totalmem || "N/A" }}</div>
          </div>
          <h6 class="mt-2">Configuration:</h6>
          <div class="row">
            <div class="col">Key</div>
            <div class="col">Value</div>
          </div>
          <div v-for="entry in Object.entries(data.server.config || {})" :key="entry[0] + ''" class="row">
            <div class="col">{{ entry[0] }}</div>
            <div class="col">{{ entry[1] }}</div>
          </div>
        </div>
      </div>
      <div class="card col-sm m-1">
        <div class="card-body">
          <h5 class="card-title">
            Crawler
            <span
              class="badge ml-2"
              :class="{
                'bg-danger': data.crawler.status !== 'available',
                'bg-success': data.crawler.status === 'available',
              }"
              >{{ data.crawler.status }}</span
            >
          </h5>
          <template v-if="data.crawler.status === 'available'">
            <div class="row">
              <div class="col">Project Version</div>
              <div class="col">{{ data.crawler.project_version || "N/A" }}</div>
            </div>
            <div class="row">
              <div class="col">Node Version</div>
              <div class="col">{{ data.crawler.node_version || "N/A" }}</div>
            </div>
            <div class="row">
              <div class="col">CPU</div>
              <div class="col">{{ (data.crawler.cpu_average || []).join(", ") }}</div>
            </div>
            <div class="row">
              <div class="col">Memory</div>
              <div class="col">
                RSS: {{ (data.crawler.memory || { rss: "N/A" }).rss }}; Heap Used:
                {{ (data.crawler.memory || { heapUsed: "N/A" }).heapUsed }}; Heap Total:
                {{ (data.crawler.memory || { heapTotal: "N/A" }).heapTotal }}
              </div>
            </div>
            <div class="row">
              <div class="col">Uptime</div>
              <div class="col">{{ data.crawler.uptime || "N/A" }}</div>
            </div>
            <div class="row">
              <div class="col">Free Memory</div>
              <div class="col">{{ data.crawler.freemem || "N/A" }}</div>
            </div>
            <div class="row">
              <div class="col">Total Memory</div>
              <div class="col">{{ data.crawler.totalmem || "N/A" }}</div>
            </div>
            <h6 class="mt-2">Configuration:</h6>
            <div class="row">
              <div class="col">Key</div>
              <div class="col">Value</div>
            </div>
            <div v-for="entry in Object.entries(data.crawler.config || {})" :key="entry[0] + ''" class="row">
              <div class="col">{{ entry[0] }}</div>
              <div class="col">{{ entry[1] }}</div>
            </div>
            <h6 class="mt-2">Loaded Hooks:</h6>
            <div class="row">
              <div class="col">Name</div>
              <div class="col">Medium</div>
              <div class="col">Domain</div>
            </div>
            <div v-for="hook in data.crawler.hooks.all" :key="hook.name" class="row">
              <div class="col">{{ hook.name }}</div>
              <div class="col">{{ hook.medium }}</div>
              <div class="col">{{ hook.domain }}</div>
            </div>
            <h6 class="mt-2">Loaded TocScraper:</h6>
            <div class="row">
              <div class="col">Name</div>
              <div class="col">Pattern</div>
            </div>
            <div v-for="hook in data.crawler.hooks.toc" :key="hook.name" class="row">
              <div class="col">{{ hook.name }}</div>
              <div class="col">{{ hook.pattern }}</div>
            </div>
            <h6 class="mt-2">Loaded DownloadScraper:</h6>
            <div class="row">
              <div class="col">Name</div>
              <div class="col">Pattern</div>
            </div>
            <div v-for="hook in data.crawler.hooks.download" :key="hook.name" class="row">
              <div class="col">{{ hook.name }}</div>
              <div class="col">{{ hook.pattern }}</div>
            </div>
            <h6 class="mt-2">Loaded SearchScraper:</h6>
            <div v-for="hook in data.crawler.hooks.search" :key="hook.name" class="row">
              <div class="col">{{ hook.name }}</div>
            </div>
            <h6 class="mt-2">Loaded TocSearchScraper:</h6>
            <div class="row">
              <div class="col">Name</div>
              <div class="col">Pattern</div>
            </div>
            <div v-for="hook in data.crawler.hooks.tocSearch" :key="hook.name" class="row">
              <div class="col">{{ hook.name }}</div>
              <div class="col">{{ hook.pattern }}</div>
            </div>
            <h6 class="mt-2">Loaded NewsScraper:</h6>
            <div class="row">
              <div class="col">Name</div>
              <div class="col">Link</div>
            </div>
            <div v-for="hook in data.crawler.hooks.news" :key="hook.name" class="row">
              <div class="col">{{ hook.name }}</div>
              <div class="col">{{ hook.link }}</div>
            </div>
          </template>
        </div>
      </div>
      <div class="card col-sm m-1">
        <div class="card-body">
          <h5 class="card-title">
            Database
            <span
              class="badge ml-2"
              :class="{
                'bg-danger': data.database.status !== 'available',
                'bg-success': data.database.status === 'available',
              }"
              >{{ data.database.status }}</span
            >
          </h5>
          <div class="row">
            <div class="col">Type</div>
            <div class="col">{{ data.database.type || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">Version</div>
            <div class="col">{{ ("version" in data.database && data.database.version) || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">Host</div>
            <div class="col">{{ data.database.host || "N/A" }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Status } from "enterprise-server/src/types";
import { defineComponent } from "vue";
import { HttpClient } from "../Httpclient";

function defaultStatus() {
  return {
    crawler: { status: "unavailable" },
    database: { status: "unavailable" },
    server: {},
  } as Status;
}

export default defineComponent({
  name: "ServerStatus",
  data: () => ({
    data: defaultStatus(),
  }),
  created() {
    this.load();
  },
  methods: {
    load() {
      HttpClient.getStatus()
        .then((value) => {
          // prevent possible render error
          if (typeof value === "object" && value && value.crawler && value.database && value.server) {
            if (value.crawler.status === "available") {
              if (!value.crawler.hooks) {
                value.crawler.hooks = {
                  all: [],
                  download: [],
                  news: [],
                  search: [],
                  toc: [],
                  tocSearch: [],
                };
              } else {
                const keys: Array<keyof typeof value.crawler["hooks"]> = [
                  "all",
                  "download",
                  "news",
                  "search",
                  "toc",
                  "tocSearch",
                ];

                for (const key of keys) {
                  if (!value.crawler.hooks[key]) {
                    value.crawler.hooks[key] = [];
                  }
                }
              }
              if (!value.crawler.config) {
                // @ts-expect-error
                value.crawler.config = {};
              }
            }

            if (!value.server.config) {
              // @ts-expect-error
              value.server.config = {};
            }
            this.data = value;
          } else {
            this.data = defaultStatus();
          }
        })
        .catch(console.error);
    },
  },
});
</script>
