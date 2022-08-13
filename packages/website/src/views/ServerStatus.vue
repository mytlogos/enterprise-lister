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
              :class="{
                'bg-danger': !data.status.server.project_version,
                'bg-success': !!data.status.server.project_version,
              }"
              >{{ data.status.server.project_version ? "available" : "unavailable" }}</span
            >
          </h5>
          <div class="row">
            <div class="col">Project Version</div>
            <div class="col">{{ data.status.server.project_version || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">Node Version</div>
            <div class="col">{{ data.status.server.node_version || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">CPU</div>
            <div class="col">{{ (data.status.server.cpu_average || []).join(", ") }}</div>
          </div>
          <div class="row">
            <div class="col">Memory</div>
            <div class="col">
              RSS: {{ (data.status.server.memory || { rss: "N/A" }).rss }}; Heap Used:
              {{ (data.status.server.memory || { heapUsed: "N/A" }).heapUsed }}; Heap Total:
              {{ (data.status.server.memory || { heapTotal: "N/A" }).heapTotal }}
            </div>
          </div>
          <div class="row">
            <div class="col">Uptime</div>
            <div class="col">{{ data.status.server.uptime || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">Free Memory</div>
            <div class="col">{{ data.status.server.freemem || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">Total Memory</div>
            <div class="col">{{ data.status.server.totalmem || "N/A" }}</div>
          </div>
          <h6 class="mt-2">Configuration:</h6>
          <table class="table" aria-label="Server Configuration">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in Object.entries(data.status.server.config || {})" :key="entry[0] + ''">
                <td>{{ entry[0] }}</td>
                <td>{{ entry[1] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="card col-sm m-1">
        <div class="card-body">
          <h5 class="card-title">
            Crawler
            <span
              class="badge ml-2"
              :class="{
                'bg-danger': data.status.crawler.status !== 'available',
                'bg-success': data.status.crawler.status === 'available',
              }"
              >{{ data.status.crawler.status }}</span
            >
          </h5>
          <template v-if="data.status.crawler.status === 'available'">
            <div class="row">
              <div class="col">Project Version</div>
              <div class="col">{{ data.status.crawler.project_version || "N/A" }}</div>
            </div>
            <div class="row">
              <div class="col">Node Version</div>
              <div class="col">{{ data.status.crawler.node_version || "N/A" }}</div>
            </div>
            <div class="row">
              <div class="col">CPU</div>
              <div class="col">{{ (data.status.crawler.cpu_average || []).join(", ") }}</div>
            </div>
            <div class="row">
              <div class="col">Memory</div>
              <div class="col">
                RSS: {{ (data.status.crawler.memory || { rss: "N/A" }).rss }}; Heap Used:
                {{ (data.status.crawler.memory || { heapUsed: "N/A" }).heapUsed }}; Heap Total:
                {{ (data.status.crawler.memory || { heapTotal: "N/A" }).heapTotal }}
              </div>
            </div>
            <div class="row">
              <div class="col">Uptime</div>
              <div class="col">{{ data.status.crawler.uptime || "N/A" }}</div>
            </div>
            <div class="row">
              <div class="col">Free Memory</div>
              <div class="col">{{ data.status.crawler.freemem || "N/A" }}</div>
            </div>
            <div class="row">
              <div class="col">Total Memory</div>
              <div class="col">{{ data.status.crawler.totalmem || "N/A" }}</div>
            </div>
            <h6 class="mt-2">Configuration:</h6>
            <table class="table" aria-label="Crawler Configuration">
              <thead>
                <tr>
                  <th scope="col">Key</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in Object.entries(data.status.crawler.config || {})" :key="entry[0] + ''">
                  <td>{{ entry[0] }}</td>
                  <td>{{ entry[1] }}</td>
                </tr>
              </tbody>
            </table>
            <h6 class="mt-2">Loaded Hooks:</h6>
            <table class="table" aria-label="Loaded Hooks">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Medium</th>
                  <th scope="col">Domain</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="hook in data.status.crawler.hooks.all" :key="hook.name">
                  <td>{{ hook.name }}</td>
                  <td>{{ hook.medium }}</td>
                  <td>{{ hook.domain }}</td>
                </tr>
              </tbody>
            </table>
            <h6 class="mt-2">Loaded TocScraper:</h6>
            <table class="table" aria-label="Loaded TocScraper">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Pattern</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="hook in data.status.crawler.hooks.toc" :key="hook.name">
                  <td>{{ hook.name }}</td>
                  <td>{{ hook.pattern }}</td>
                </tr>
              </tbody>
            </table>
            <h6 class="mt-2">Loaded DownloadScraper:</h6>
            <table class="table" aria-label="Loaded DownloadScraper">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Pattern</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="hook in data.status.crawler.hooks.download" :key="hook.name">
                  <td>{{ hook.name }}</td>
                  <td>{{ hook.pattern }}</td>
                </tr>
              </tbody>
            </table>
            <h6 class="mt-2">Loaded SearchScraper:</h6>
            <div v-for="hook in data.status.crawler.hooks.search" :key="hook.name" class="row">
              <div class="col">{{ hook.name }}</div>
            </div>
            <h6 class="mt-2">Loaded TocSearchScraper:</h6>
            <table class="table" aria-label="Loaded TocSearchScraper">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Pattern</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="hook in data.status.crawler.hooks.tocSearch" :key="hook.name">
                  <td>{{ hook.name }}</td>
                  <td>{{ hook.pattern }}</td>
                </tr>
              </tbody>
            </table>
            <h6 class="mt-2">Loaded NewsScraper:</h6>
            <table class="table" aria-label="Loaded NewsScraper">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Link</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="hook in data.status.crawler.hooks.news" :key="hook.name">
                  <td>{{ hook.name }}</td>
                  <td>{{ hook.link }}</td>
                </tr>
              </tbody>
            </table>
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
                'bg-danger': data.status.database.status !== 'available',
                'bg-success': data.status.database.status === 'available',
              }"
              >{{ data.status.database.status }}</span
            >
          </h5>
          <div class="row">
            <div class="col">Type</div>
            <div class="col">{{ data.status.database.type || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">Version</div>
            <div class="col">{{ ("version" in data.status.database && data.status.database.version) || "N/A" }}</div>
          </div>
          <div class="row">
            <div class="col">Host</div>
            <div class="col">{{ data.status.database.host || "N/A" }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { Status } from "enterprise-server/dist/types";
import { reactive } from "vue";
import { HttpClient } from "../Httpclient";

function defaultStatus(): Status {
  return {
    crawler: { status: "unavailable" },
    database: { status: "unavailable", type: "unknown", host: "unknown" },
    // @ts-expect-error
    server: {},
  };
}

const data = reactive<{ status: Status }>({
  status: defaultStatus(),
});

load();

function load() {
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
        data.status = value;
      } else {
        data.status = defaultStatus();
      }
    })
    .catch(console.error);
}
</script>
