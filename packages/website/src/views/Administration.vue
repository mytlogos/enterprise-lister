<template>
  <div class="row">
    <div class="navbar navbar-expand-xl navbar-dark align-items-start col-auto mx-auto">
      <ul class="navbar-nav bg-dark align-items-start flex-column">
        <li class="nav-item p-2">
          <router-link :to="{ name: 'status' }" tag="a" class="nav-link"> Status </router-link>
        </li>
        <li class="nav-item p-2">
          <router-link :to="{ name: 'jobs' }" tag="a" class="nav-link"> Jobs </router-link>
        </li>
        <li class="nav-item p-2">
          <router-link :to="{ name: 'job-stats' }" tag="a" class="nav-link text-nowrap"> Job Statistics </router-link>
        </li>
        <li class="nav-item p-2">
          <router-link :to="{ name: 'hooks' }" tag="a" class="nav-link text-nowrap">Hooks</router-link>
        </li>
        <li class="nav-item p-2">
          <router-link :to="{ name: 'jobhistory' }" tag="a" class="nav-link text-nowrap">Job History</router-link>
        </li>
        <li class="nav-item p-2">
          <router-link :to="{ name: 'joblive' }" tag="a" class="nav-link text-nowrap">Live Jobs</router-link>
        </li>
      </ul>
    </div>
    <router-view class="col-sm" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "Administration",
});
</script>
