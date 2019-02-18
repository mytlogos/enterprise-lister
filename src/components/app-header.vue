<template>
    <header>
        <nav id="navbar">
            <template v-if="loggedIn">
                <span>{{name}}</span>
                <router-link to="addMedium" tag="button" class="btn">Add Medium</router-link>
                <router-link to="addList" tag="button" class="btn">Add List</router-link>
                <router-link to="news" tag="button" class="btn">News</router-link>
                <router-link to="/" tag="button" class="btn">Lists</router-link>
                <router-link to="settings" tag="button" class="btn">
                    <img alt="Settings" src="../assets/config_icon.png">
                </router-link>
                <router-link @click="logout" to="/" tag="button" class="btn">Logout</router-link>
            </template>
            <template v-else>
                <router-link to="register" tag="button" class="btn">Register</router-link>
                <router-link to="login" tag="button" class="btn">Login</router-link>
            </template>
        </nav>
    </header>
</template>

<script>
    import simpleButton from "./simple-button";
    import {emitBusEvent} from "../bus";

    export default {
        components: {
            simpleButton
        },
        props: {
            loggedIn: Boolean,
            showLists: Boolean,
            showSettings: Boolean,
            showReleases: Boolean,
            name: String,
        },
        methods: {
            logout() {
                emitBusEvent("do:logout");
            }
        },
        name: "app-header"
    };
</script>
