<template>
    <modal @finish="sendForm()" v-bind:error="error">
        <template slot="title">Login</template>
        <template slot="input">
            <label>
                Identifier:
                <input class="user" placeholder="Your identifier" title="Identifier" type="text" v-model="user">
            </label>
            <label>
                Password:
                <input class="pw" placeholder="Your password" title="Password" type="password" v-model="pw">
            </label>
            <label>
                <select v-model="selected">
                    <option v-bind:value="option.values" v-for="option in options">
                        {{option.name}}
                    </option>
                </select>
            </label>
            <a target="_blank" v-bind:href="currentLink">
                Open External
            </a>
        </template>
        <template slot="finish">Add</template>
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
                selected: 0
            };
        },
        props: {
            options: Array,
        },
        computed: {
            currentLink() {
                const option = this.options.find((value) => value.values === this.selected);
                return option ? option.link : "#";
            }
        },
        methods: {
            sendForm() {
                emitBusEvent("add:externalUser", {identifier: this.user, pwd: this.pw, type: this.selected});
            },
        },
        watch: {
            show(show) {
                if (!show) {
                    this.user = "";
                    this.pw = "";
                }
            }
        },
        name: "add-external-modal"
    };
</script>

<style scoped>

</style>
