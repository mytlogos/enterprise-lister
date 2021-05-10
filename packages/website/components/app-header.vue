<template>
  <nav class="navbar navbar-expand-xl navbar-dark bg-dark">
    <!-- TODO: set active dynamically via router? -->
    <router-link :to="{ name: 'home' }" tag="a" class="nav-link navbar-brand active"> Enterprise </router-link>
    <div class="collapse navbar-collapse">
      <ul class="navbar-nav mr-auto">
        <template v-if="loggedIn">
          <li class="nav-item">
            <span class="navbar-text">{{ name }}</span>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'addMedium' }" tag="a" class="nav-link"> Add Medium </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'addList' }" tag="a" class="nav-link"> Add List </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'news' }" tag="a" class="nav-link"> News </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'readHistory' }" tag="a" class="nav-link"> Read History </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'lists' }" tag="a" class="nav-link"> Lists </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'releases' }" tag="a" class="nav-link"> Releases </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'media' }" tag="a" class="nav-link"> Media </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'media-in-wait' }" tag="a" class="nav-link"> Unused Media </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'search' }" tag="a" class="nav-link"> Search </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'admin' }" tag="a" class="nav-link"> Administration </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'settings' }" tag="a" class="nav-link">
              <img alt="Settings" src="../assets/config_icon.png" />
            </router-link>
          </li>
        </template>
        <template v-else>
          <li class="nav-item">
            <router-link :to="{ name: 'register' }" tag="a" class="nav-link"> Register </router-link>
          </li>
          <li class="nav-item">
            <router-link :to="{ name: 'login' }" tag="a" class="nav-link"> Login </router-link>
          </li>
        </template>
      </ul>
      <ul class="navbar-nav">
        <template v-if="loggedIn">
          <li class="nav-item">
            <router-link :to="{ name: 'home' }" tag="a" class="nav-link" @click="logout"> Logout </router-link>
          </li>
        </template>
      </ul>
    </div>
  </nav>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapGetters, mapState } from "vuex";

export default defineComponent({
  name: "AppHeader",
  computed: {
    ...mapState(["name"]),
    ...mapGetters(["loggedIn"]),
  },
  methods: {
    logout(): void {
      this.$store.dispatch("logout");
    },
  },
});
</script>
