<template>
  <div
    v-if="show"
    class="modal"
  >
    <div class="modal-header">
      <button
        class="close"
        title="Close"
        type="button"
        @click="close()"
      >
        <span>×</span>
      </button>
    </div>
    <div v-if="failure">
      <!--TODO Insert failure icon and text-->
    </div>
    <span v-else>Are you sure you want to delete: {{ object.name }}</span>
    <div class="button">
      <button
        type="button"
        @click="sendForm"
      >
        Sure, Delete it
      </button>
    </div>
  </div>
</template>

<script>
import {emitBusEvent, onBusEvent} from "../../bus";
import modal from "./modal";

export default {
    name: "DeleteModal",
    components: {modal},
    props: {
        show: Boolean,
        object: Object,
    },
    data(): { failure: boolean } {
        return {
            failure: false,
        };
    },
    watch: {
        show(newValue: boolean): void {
            if (!newValue) {
                this.failure = false;
            }
        }
    },
    mounted(): void {
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
    methods: {
        sendForm(): void {
            emitBusEvent("delete:" + this.object.type, this.object.id);
        },
        close(): void {
            this.$emit("hide");
        }
    }
};
</script>
