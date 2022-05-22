import { createApp } from "vue";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "primevue/resources/themes/saga-blue/theme.css"; //theme
import "primevue/resources/primevue.min.css"; //core css
import "primeicons/primeicons.css"; //icons
import Router from "./router";
import AppComponent from "./App.vue";
import "./registerServiceWorker";
import VueObserveVisibility from "vue-observe-visibility";
import { store } from "./store/store";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import Toast from "primevue/toast";
import Badge from "primevue/badge";
import BadgeDirective from "primevue/badgedirective";
import Button from "primevue/button";
import SelectButton from "primevue/selectbutton";
import AutoComplete from "primevue/autocomplete";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tooltip from "primevue/tooltip";
import InputText from "primevue/inputtext";
import Checkbox from "primevue/checkbox";
import DataView from "primevue/dataview";
import Card from "primevue/card";

const app = createApp(AppComponent);
// @ts-expect-error
app.config.devtools = true;
app.use(VueObserveVisibility);
app.use(Router);
app.use(store);
app.use(PrimeVue);
app.use(ToastService);
app.component("Toast", Toast);
app.component("Button", Button);
app.component("SelectButton", SelectButton);
app.component("AutoComplete", AutoComplete);
app.component("DataTable", DataTable);
app.component("Column", Column);
app.component("Badge", Badge);
app.component("InputText", InputText);
app.component("Checkbox", Checkbox);
app.component("DataView", DataView);
app.component("Card", Card);
app.directive("badge", BadgeDirective);
app.directive("tooltip", Tooltip);
Router.isReady().then(() => app.mount("#app"));
// For debugging purposes?
// @ts-expect-error
globalThis.app = app;
// @ts-expect-error
globalThis.router = Router;

// TODO rework news, add the read property to news item itself instead of asking for it
// TODO login mechanism, check if it was already logged in before
// TODO give a reason for any rejects
