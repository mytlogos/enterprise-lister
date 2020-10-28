<template>
  <div class="d-flex">
    <div class="navbar navbar-expand-xl navbar-dark align-items-start">
      <ul class="navbar-nav bg-dark align-items-start">
        <li class="nav-item">
          <router-link
            :to="{ name: 'jobs' }"
            tag="a"
            class="nav-link active"
          >
            Jobs
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