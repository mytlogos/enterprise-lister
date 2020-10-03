<template>
    <modal @finish="send()" v-bind:error="error" v-bind:show="show">
        <template slot="title">Register</template>
        <template slot="input">
            <label>
                Username:
                <input class="user" placeholder="Your username" title="Username" type="text" v-model="lists">
            </label>
            <label>
                Password:
                <input class="pw" placeholder="Your password" title="Password" type="password" v-model="pw">
            </label>
            <label>
                Repeat Password:
                <input class="pw-repeat" placeholder="Your password again" title="Repeat Password" type="password"
                       v-model="pwRepeat">
            </label>
        </template>
        <template slot="finish">Register</template>
    </modal>
</template>
<script>
    import {emitBusEvent} from "../bus";
    import modal from "../components/modal/modal";

    export default {
        components: {modal},
        data() {
            return {
                lists: "",
                pw: "",
                pwRepeat: "",
            };
        },
        props: {
            show: Boolean,
            error: String,
        },
        methods: {
            sendForm() {
                emitBusEvent("do:register", {lists: this.lists, pw: this.pw, pwRepeat: this.pwRepeat});
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
        name: "register-modal",
    };
</script>
