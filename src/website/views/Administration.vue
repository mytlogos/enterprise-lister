<template>
  <div class="d-flex">
    <div class="navbar navbar-expand-xl navbar-dark align-items-start">
      <ul class="navbar-nav bg-dark align-items-start flex-column">
        <li class="nav-item m-auto">
          <router-link
            :to="{ name: 'jobs' }"
            tag="a"
            class="nav-link"
          >
            Jobs
          </router-link>
        </li>
        <li class="nav-item m-auto">
          <router-link
            :to="{ name: 'job-stats' }"
            tag="a"
            class="nav-link text-nowrap"
          >
            Job Statistics
          </router-link>
        </li>
      </ul>
    </div>
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "Administration"
});
</script>