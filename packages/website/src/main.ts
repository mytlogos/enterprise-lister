import { createApp } from "vue";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import "primevue/resources/themes/saga-blue/theme.css"; // theme
import "primevue/resources/primevue.min.css"; // core css
import "primeicons/primeicons.css"; // icons
import "primeflex/primeflex.css"; // flex utilities
import Router from "./router";
import AppComponent from "./App.vue";
import "./registerServiceWorker";
import VueObserveVisibility from "vue-observe-visibility";
import { pinia } from "./store/pinia";
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
import Toolbar from "primevue/toolbar";
import TriStateCheckbox from "primevue/tristatecheckbox";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import Dropdown from "primevue/dropdown";
import Paginator from "primevue/paginator";
import Chip from "primevue/chip";
import Tag from "primevue/tag";
import ListBox from "primevue/listbox";
import ConfirmDialog from "primevue/confirmdialog";
import ConfirmationService from "primevue/confirmationservice";
import Inplace from "primevue/inplace";
import Divider from "primevue/divider";
import Calendar from "primevue/calendar";

const app = createApp(AppComponent);
// @ts-expect-error
app.config.devtools = true;
app.use(VueObserveVisibility);
app.use(Router);
app.use(PrimeVue);
app.use(ToastService);
app.use(ConfirmationService);
app.use(pinia);
app.component("Toast", Toast);
app.component("PButton", Button);
app.component("SelectButton", SelectButton);
app.component("AutoComplete", AutoComplete);
app.component("DataTable", DataTable);
app.component("Column", Column);
app.component("Badge", Badge);
app.component("InputText", InputText);
app.component("Checkbox", Checkbox);
app.component("DataView", DataView);
app.component("Card", Card);
app.component("Toolbar", Toolbar);
app.component("TriStateCheckbox", TriStateCheckbox);
app.component("PDialog", Dialog);
app.component("InputNumber", InputNumber);
app.component("Dropdown", Dropdown);
app.component("PPaginator", Paginator);
app.component("Chip", Chip);
app.component("Tag", Tag);
app.component("ListBox", ListBox);
app.component("ConfirmDialog", ConfirmDialog);
app.component("Inplace", Inplace);
app.component("Divider", Divider);
app.component("Calendar", Calendar);
app.directive("badge", BadgeDirective);
app.directive("tooltip", Tooltip);
Router.isReady().then(() => app.mount("#app"));
// For debugging purposes?
// @ts-expect-error
globalThis.app = app;
// @ts-expect-error
globalThis.router = Router;

// TODO login mechanism, check if it was already logged in before
// TODO give a reason for any rejects
