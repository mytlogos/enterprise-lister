import { createApp } from "vue";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.css";
import Router from "./router";
import AppComponent from "./App.vue";
import VueObserveVisibility from "vue-observe-visibility";
import { store } from "./store";

const app = createApp(AppComponent);
// @ts-ignore
app.config.devtools = true;
app.use(VueObserveVisibility);
app.use(Router);
app.use(store);
Router.isReady().then(() => app.mount("#app"));
globalThis.app = app;
globalThis.router = Router;



// TODO rework news, add the read property to news item itself instead of asking for it
// TODO login mechanism, check if it was already logged in before
// TODO give a reason for any rejects
