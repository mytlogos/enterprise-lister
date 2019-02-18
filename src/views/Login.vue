<template>
    <modal @finish="sendForm()">
        <template slot="title">Login</template>
        <template slot="input">
            <label>
                Username:
                <input class="user" placeholder="Your username" title="Username" type="text" v-model="user">
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
    import {emitBusEvent} from "../bus";
    import modal from "../components/modal/modal";

    export default {
        components: {modal},
        data() {
            return {
                user: "",
                pw: "",
            };
        },
        methods: {
            sendForm() {
                emitBusEvent("do:login", {user: this.user, pw: this.pw});
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
        name: "Login"
    };
</script>

<style scoped>

</style>
