<template>
    <modal @finish="sendForm()" v-bind:error="error" v-bind:show="show">
        <template slot="title">Login</template>
        <template slot="input">
            <label>
                Username:
                <input class="user" placeholder="Your username" title="Username" type="text" v-model="lists">
            </label>
            <label>
                Password:
                <input class="pw" placeholder="Your password" title="Password" type="password" v-model="pw">
            </label>
        </template>
        <div class="lost" slot="after">
            Forgot your password?
        </div>
        <template slot="finish">Login</template>
    </modal>
</template>
<script>
    import {emitBusEvent} from "../../bus";
    import modal from "./modal";

    export default {
        components: {modal},
        data() {
            return {
                lists: "",
                pw: "",
            };
        },
        props: {
            show: Boolean,
            error: String,
        },
        mounted() {
            console.log("hi");
        },
        methods: {
            sendForm() {
                emitBusEvent("do:login", {lists: this.lists, pw: this.pw});
            },
        },
        watch: {
            show(newValue) {
                if (!newValue) {
                    this.user = "";
                    this.pw = "";
                }
            },
        },
        name: "login-modal"
    };
</script>
