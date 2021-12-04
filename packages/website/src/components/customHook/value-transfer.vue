<template>
  <div>
    <div class="row mb-3">
      <div class="col">
        <!-- TODO: use select instead of string -->
        <label for="attributeName" class="form-label">Target Key</label>
        <input id="attributeName" type="text" class="form-control" placeholder="Name of the Attribute" />
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col">
        <div class="form-check form-switch">
          <input
            id="optionalTransfer"
            v-model="optional"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="optional"
          />
          <label class="form-check-label" for="optionalTransfer">Optional (does not throw error when failing)</label>
        </div>
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col">
        <div class="form-check form-switch">
          <input
            id="useHtml"
            v-model="useHtml"
            class="form-check-input"
            type="checkbox"
            role="switch"
            :checked="useHtml"
          />
          <label class="form-check-label" for="useHtml">Use HTML for value source</label>
        </div>
      </div>
    </div>
    <div>Transfer Mapping</div>
    <div v-for="value in mappings" :key="value.from" class="row align-items-center mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">From</label>
        <input id="attributeName" v-model="value.from" type="text" class="form-control" placeholder="Mapped from" />
      </div>
      <div class="col">
        <label for="attributeName" class="form-label">To</label>
        <input id="attributeName" v-model="value.to" type="text" class="form-control" placeholder="Mapped to" />
      </div>
    </div>
    <div class="row align-items-center mb-3">
      <div class="col">
        <label for="attributeName" class="form-label">From</label>
        <input
          id="attributeName"
          v-model="nextFrom"
          type="text"
          class="form-control"
          placeholder="Mapped from"
          @keyup.enter="createMapping"
        />
      </div>
      <div class="col">
        <label for="attributeName" class="form-label">To</label>
        <input
          id="attributeName"
          v-model="nextTo"
          type="text"
          class="form-control"
          placeholder="Mapped to"
          @keyup.enter="createMapping"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { idGenerator } from "../../init";

const nextId = idGenerator();

export default defineComponent({
  name: "ValueTransfer",
  data: () => ({
    id: nextId(),
    optional: false,
    useHtml: false,
    nextTo: "",
    nextFrom: "",
    mappings: [] as Array<{ from: string; to: string }>,
  }),
  methods: {
    createMapping() {
      this.mappings.push({ from: this.nextFrom, to: this.nextTo });
      this.nextFrom = "";
      this.nextTo = "";
    },
  },
});
</script>
