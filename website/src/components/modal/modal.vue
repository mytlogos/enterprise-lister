<template>
    <div class="modal">
        <div class="modal-header">
            <span>
                <slot name="title"></slot>
            </span>
        </div>
        <slot name="text"></slot>
        <form>
            <slot name="input"></slot>
            <div class="button">
                <button @click="$emit('finish')" class="finish" type="button">
                    <slot name="finish">Save</slot>
                </button>
            </div>
            <slot name="after"></slot>
            <div class="error"></div>
        </form>
    </div>
</template>
<script>
    import {emitBusEvent} from "../../bus";

    export default {
        props: {
            error: String,
        },
        mounted() {
            document.addEventListener("click", (evt) => {
                // noinspection JSCheckFunctionSignatures
                if (!this.$el.contains(evt.target) && this.show) {
                    evt.stopImmediatePropagation();
                    evt.preventDefault();
                    this.close();
                }
            }, {capture: true});
        },
        methods: {
            close() {
                emitBusEvent("reset:modal");
            }
        },
        name: "modal"
    };
</script>
