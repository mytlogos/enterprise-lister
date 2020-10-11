<template>
  <nav class="navbar navbar-expand-xl navbar-dark bg-dark">
    <!-- TODO: set active dynamically via router? -->
    <router-link
      to="home"
      tag="a"
      class="nav-link navbar-brand active"
    >
      Enterprise
    </router-link>
    <div class="collapse navbar-collapse">
      <ul class="navbar-nav mr-auto">
        <template v-if="loggedIn">
          <li class="nav-item">
            <span class="navbar-text">{{ name }}</span>
          </li>
          <li class="nav-item">
            <router-link
              to="addMedium"
              tag="a"
              class="nav-link"
            >
              Add Medium
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="addList"
              tag="a"
              class="nav-link"
            >
              Add List
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="news"
              tag="a"
              class="nav-link"
            >
              News
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="readHistory"
              tag="a"
              class="nav-link"
            >
              Read History
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="list"
              tag="a"
              class="nav-link"
            >
              Lists
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="releases"
              tag="a"
              class="nav-link"
            >
              Releases
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="settings"
              tag="a"
              class="nav-link"
            >
              <img
                alt="Settings"
                src="../assets/config_icon.png"
              >
            </router-link>
          </li>
        </template>
        <template v-else>
          <li class="nav-item">
            <router-link
              to="register"
              tag="a"
              class="nav-link"
            >
              Register
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="login"
              tag="a"
              class="nav-link"
            >
              Login
            </router-link>
          </li>
        </template>
      </ul>
      <ul class="navbar-nav">
        <template v-if="loggedIn">
          <li class="nav-item">
            <router-link
              to="/"
              tag="a"
              class="nav-link"
              @click="logout"
            >
              Logout
            </router-link>
          </li>
        </template>
      </ul>
    </div>
  </nav>
</template>

<script lang="ts">
import {emitBusEvent} from "../bus";

import { defineComponent } from "vue";

export default defineComponent({
    name: "AppHeader",
    props: {
        loggedIn: Boolean,
        showLists: Boolean,
        showSettings: Boolean,
        showReleases: Boolean,
        name: { type: String, required: true },
    },
    methods: {
        logout(): void {
            emitBusEvent("do:logout");
        }
    }
});
</script>
