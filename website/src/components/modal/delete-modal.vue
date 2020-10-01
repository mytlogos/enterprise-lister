<template>
    <div class="modal" v-if="show">
        <div class="modal-header">
            <button @click="close()" class="close" title="Close" type="button">
                <span>×</span>
            </button>
        </div>
        <div v-if="failure">
            <!--todo Insert failure icon and text-->
        </div>
        <span v-else>Are you sure you want to delete: {{object.name}}</span>
        <div class="button">
            <button @click="sendForm" type="button">
                Sure, Delete it
            </button>
        </div>
    </div>
</template>

<script>
    import {emitBusEvent, onBusEvent} from "../../bus";
    import modal from "./modal";

    export default {
        components: {modal},
        data() {
            return {
                failure: false,
            };
        },
        props: {
            show: Boolean,
            object: Object,
        },
        methods: {
            sendForm() {
                emitBusEvent("delete:" + this.object.type, this.object.id);
            },
            close() {
                this.$emit("hide");
            }
        },
        mounted() {
            document.addEventListener("click", (evt) => {
                if (!this.$el.contains(evt.target) && this.show) {
                    evt.stopImmediatePropagation();
                    this.close();
                }
            }, {capture: true});
            onBusEvent("deletion", (failure) => {
                if (!this.show) {
                    return;
                }
                if (!failure) {
                    this.close();
                }
                this.failure = failure;
            });
        },
        watch: {
            show(newValue) {
                if (!newValue) {
                    this.failure = false;
                }
            }
        },
        name: "delete-modal"
    };
</script>
