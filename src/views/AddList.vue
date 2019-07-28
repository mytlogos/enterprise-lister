<template>
    <modal @finish="send()" v-bind:error="error" v-bind:show="show">
        <template slot="title">Add Reading List</template>
        <template slot="input">
            <div class="input-name">
                <label>
                    Name:
                    <input name="name" required title="List Name" type="text" v-model="name">
                </label>
            </div>
            <div class="input-medium">
                <label>Medium:</label>
                <span class="medium-check-container" v-for="type of mediaTypes">
                    <label>
                        <input type="checkbox" v-model="type.checked"/>
                        {{type.name}}
                    </label>
                </span>
            </div>
        </template>
        <template slot="finish">Add List</template>
    </modal>
</template>

<script>
    import {emitBusEvent} from "../bus";
    import modal from "../components/modal/modal";

    export default {
        components: {modal},
        data() {
            return {
                mediaTypes: [
                    {
                        name: "Text",
                        checked: false,
                        value: 0x1,
                    },
                    {
                        name: "Audio",
                        checked: false,
                        value: 0x2,
                    },
                    {
                        name: "Video",
                        checked: false,
                        value: 0x4,
                    },
                    {
                        name: "Image",
                        checked: false,
                        value: 0x8,
                    },
                ],
                name: ""
            };
        },
        props: {
            show: Boolean,
            error: String,
        },

        methods: {
            send() {
                let mediumType = 0;
                this.mediaTypes.forEach((value) => {
                    if (value.checked) {
                        mediumType |= value.values;
                    }
                });
                emitBusEvent("do:add-list", {name: this.name, type: mediumType});
            }
        },
        name: "add-list-modal"
    };
</script>

