<template>
    <button @click="emit(event)" class="btn">{{name}}</button>
</template>

<script>
    import {emitBusEvent} from "../bus";

    export default {
        props: {
            event: String,
            name: String
        },
        methods: {
            logout(value) {
                console.log("emitting");
                emitBusEvent(value);
            }
        },
        name: "app-header"
    };
</script>
