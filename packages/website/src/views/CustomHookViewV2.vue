<template>
  <div class="w-100">
    <div class="row">
      <div class="col text-end">
        <button class="btn btn-success" @click="save">Save</button>
      </div>
    </div>
    <div v-if="createResult === 'success'" class="alert alert-success" role="alert">
      Successfully saved CustomHook {{ value.name }}
    </div>
    <div v-else-if="createResult === 'failed'" class="alert alert-danger" role="alert">
      Failed saving CustomHook {{ value.name }}
    </div>
    <div v-if="invalid.length" class="alert alert-danger" role="alert">
      <p v-for="line in invalid" :key="line">{{ line }}</p>
    </div>
    <div class="row">
      <div class="col">
        <div class="row g-3 align-items-center">
          <div class="col-auto">
            <label for="param" class="form-label">Parameter</label>
          </div>
          <div class="col-auto">
            <input id="param" v-model="param" class="form-control" name="param" type="text" />
          </div>
        </div>
      </div>
      <div class="col text-end">
        <button class="btn btn-primary me-1" :disabled="!value['news']" @click="testHook('news')">Test News</button>
        <button
          class="btn btn-primary me-1"
          :disabled="!value['toc'] || (Array.isArray(value.toc) && !value.toc.length)"
          @click="testHook('toc')"
        >
          Test ToC
        </button>
        <button class="btn btn-primary me-1" :disabled="!value['search']" @click="testHook('search')">
          Test Search
        </button>
        <button class="btn btn-primary" :disabled="!value['download']" @click="testHook('download')">
          Test Download
        </button>
      </div>
    </div>
    <div>Result:</div>
    <div v-if="loading || result" class="alert alert-info" role="alert">
      <div v-if="loading" class="d-flex align-items-center">
        <strong>Processing...</strong>
        <div class="spinner-border ms-auto" role="status" aria-hidden="true"></div>
      </div>
      <span v-else-if="result" style="white-space: pre">{{ result }}</span>
    </div>
    <custom-hook-form v-model:hook="hook" v-model:config="value" />
  </div>
</template>

<script lang="ts">
import "vue-prism-editor/dist/prismeditor.min.css"; // import the styles somewhere

// import highlighting library (you can use any library you want just return html string)
import "prismjs/components/prism-core";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-twilight.css"; // import syntax highlighting styles
import type { HookConfig } from "enterprise-scraper/dist/externals/customv2/types";
import { HttpClient } from "../Httpclient";
import { defineComponent } from "vue";
import { HookState } from "../siteTypes";
import { CustomHook } from "enterprise-core/dist/types";
import CustomHookForm from "../components/customHook/v2/custom-hook-form-v2.vue";
import { clone, Logger } from "../init";
import { validateHookConfig, ValidationError } from "enterprise-scraper/dist/externals/customv2/validation";

interface Data {
  invalid: string[];
  param: string;
  result: string;
  loading: boolean;
  createResult?: "success" | "failed";
  value: HookConfig;
  hook: CustomHook;
  logger: Logger;
}

export default defineComponent({
  components: {
    CustomHookForm,
  },
  props: {
    id: {
      type: Number,
      default: 0,
    },
  },
  data(): Data {
    return {
      loading: false,
      logger: new Logger("CustomHookView"),
      invalid: [],
      param: "",
      result: "",
      value: {
        name: "",
        base: "",
        medium: 0,
        domain: {
          flags: "",
          pattern: "",
        },
      },
      hook: {
        id: 0,
        name: "",
        comment: "",
        hookState: HookState.ENABLED,
        state: "",
      },
      createResult: undefined,
    };
  },
  created() {
    this.load();
  },
  methods: {
    testHook(hookKey: keyof HookConfig) {
      if (this.loading) {
        return;
      }
      this.loading = true;

      const hookConfig = clone(this.value);

      // only set value if it is a valid config
      try {
        const result = validateHookConfig(hookConfig);

        if (result.valid) {
          this.value = hookConfig;
          this.invalid = [];
        } else {
          this.invalid = result.errors.map((v) => {
            if (v instanceof ValidationError) {
              return v.stack;
            } else {
              return v.message;
            }
          });
          return;
        }
      } catch (error) {
        this.invalid = [error + ""];
        this.logger.error(error);
        return;
      }

      HttpClient.testHookV2({
        config: hookConfig,
        key: hookKey,
        param: this.param,
      })
        .then((value) => (this.result = JSON.stringify(value)))
        .catch((value) => {
          this.result = (value.message ? value.message + "\n" : "") + JSON.stringify(value);
        })
        .finally(() => (this.loading = false));
    },

    load() {
      if (this.id) {
        // simple but stupid way to clone the hook, firefox went off alone in 94 and introduced "structuredClone" (with Node 17 support at this time)
        // when there is wider support, maybe use that, else if lodash is ever used use that cloneDeep
        this.hook = clone(this.$store.state.hooks.hooks[this.id]);

        // only set value if it is a valid config
        try {
          const hookConfig = JSON.parse(this.hook.state);
          const result = validateHookConfig(hookConfig);

          if (result.valid) {
            this.value = hookConfig;
            this.invalid = [];
          } else {
            this.invalid = result.errors.map((v) => {
              if (v instanceof ValidationError) {
                return v.stack;
              } else {
                return v.message;
              }
            });
          }
        } catch (error) {
          this.invalid = [error + ""];
          this.logger.error(error);
        }
      }
    },

    save() {
      if (this.value.name && !this.hook.name) {
        this.hook.name = this.value.name;
      }

      if (!this.hook.name) {
        console.error("No name defined!");
        return;
      }

      // only set value if it is a valid config
      try {
        const result = validateHookConfig(this.value);

        if (result.valid) {
          this.hook.state = JSON.stringify(this.value);
          this.invalid = [];
        } else {
          this.invalid = result.errors.map((v) => {
            if (v instanceof ValidationError) {
              return v.stack;
            } else {
              return v.message;
            }
          });
          return;
        }
      } catch (error) {
        this.invalid = [error + ""];
        this.logger.error(error);
        return;
      }

      const action = this.hook.id ? "updateHook" : "createHook";

      this.$store
        .dispatch(action, this.hook)
        .then((value: CustomHook) => {
          this.logger.info(value);
          this.hook = value;
          this.createResult = "success";
        })
        .catch((value: any) => {
          this.logger.info(value);
          this.createResult = "failed";
        });
    },
  },
});
</script>
