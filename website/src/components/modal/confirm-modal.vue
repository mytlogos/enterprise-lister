<template>
    <modal :error="error" :show="show" @finish="logout('yes')">
        <template slot="title">Confirmation</template>
        <template slot="text">{{text}}</template>
        <template slot="finish">Yes</template>
    </modal>
</template>

<script>
    import modal from "./modal";

    export default {
        components: {modal},
        props: {
            text: String,
            show: Boolean,
            error: String,
        },
        name: "confirm-modal"
    };
</script>

<style scoped>

</style>
