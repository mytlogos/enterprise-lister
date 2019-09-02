<template>
    <modal @finish="send()" v-bind:error="error" v-bind:show="show">
        <template slot="title">Add Medium</template>
        <template slot="input">
            <div class="title">
                <label>
                    Title:
                    <input name="title" required title="Title" type="text" v-model="medium.title">
                </label>
            </div>
            <div class="medium">
                <label>Medium:</label>
                <span class="medium-check-container" v-for="type of mediaTypes">
                    <label>
                        <input type="checkbox" v-model="type.checked"/>
                        {{type.name}}
                    </label>
                </span>
            </div>
            <div class="author autocomplete">
                <label>
                    Author:
                    <input name="author" title="Author" type="text" v-model="medium.author">
                </label>
            </div>
            <div class="artist autocomplete">
                <label>Artist: <input name="artist" title="Artist" type="text" v-model="medium.artist"> </label>
            </div>
            <div class="series autocomplete">
                <label>Series: <input name="series" title="Series" type="text" v-model="medium.series"> </label>
            </div>
            <div class="universe autocomplete">
                <label>Universe: <input name="universe" title="Universe" type="text" v-model="medium.universe"> </label>
            </div>
            <div class="language autocomplete">
                <label>Language: <input name="language" title="Language" type="text" v-model="medium.language"> </label>
            </div>
            <div class="countryOfOrigin autocomplete">
                <label>Country Of Origin: <input name="countryOfOrigin" title="Country Of Origin" type="text"
                                                 v-model="medium.countryOfOrigin"> </label>
            </div>
            <div class="langOfOrigin autocomplete">
                <label>Language Of Origin: <input name="langOfOrigin" title="Language Of Origin" type="text"
                                                  v-model="medium.langOfOrigin"> </label>
            </div>
            <div class="stateTl autocomplete">
                <label>Status of Translator: <input name="stateTl" title="Status of Translator" type="text"
                                                    v-model="medium.stateTl"> </label>
            </div>
            <div class="stateCOO autocomplete">
                <label>Status in COO: <input name="stateCOO" title="Status in COO" type="text"
                                             v-model="medium.stateCOO">
                </label>
            </div>
            <div class="list select-container">
                <select class="list-select" title="Select list to add medium to:">
                    <option disabled selected value="">Select list to add medium to</option>
                    <option v-bind:value="list.id" v-for="list in lists">{{list.name}}</option>
                </select>
            </div>
        </template>
        <template slot="finish">Add Medium</template>
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
                name: "",
                medium: {
                    title: "",
                    author: "",
                    artist: "",
                    series: "",
                    universe: "",
                    language: "",
                    countryOfOrigin: "",
                    langOfOrigin: "",
                    stateTl: "",
                    stateCOO: "",
                }
            };
        },
        props: {
            show: Boolean,
            error: String,
            lists: Array,
        },
        mounted() {
            console.log("mounted");
        },

        methods: {
            send() {
                let mediumType = 0;
                this.mediaTypes.forEach((value) => {
                    if (value.checked) {
                        mediumType |= value.values;
                    }
                });
                const result = {type: mediumType};
                Object.assign(result, this.medium);
                console.log(result);
                emitBusEvent("do:add-medium", result);
            }
        },
        name: "add-medium-modal"
    };
</script>
