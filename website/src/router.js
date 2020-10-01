import Vue from "vue";
import Router from "vue-router";
Vue.use(Router);
let loggedIn = false;
export const info = {
    set loggedIn(value) {
        loggedIn = value;
    },
};
const router = new Router({
    mode: "history",
    base: process.env.BASE_URL,
    routes: [
        {
            path: "/",
            redirect: (to) => {
                return "/" + (to.query.redirect || "home");
            },
        },
        {
            path: "/home",
            component: () => import(/* webpackChunkName: "lists" */ "./views/Home.vue"),
        },
        {
            path: "/list",
            component: () => import(/* webpackChunkName: "lists" */ "./views/Lists.vue"),
        },
        {
            path: "/news",
            // route level code-splitting
            // this generates a separate chunk (news.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import(/* webpackChunkName: "news" */ "./views/News.vue"),
        },
        {
            path: "/settings",
            // route level code-splitting
            // this generates a separate chunk (settings.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import(/* webpackChunkName: "settings" */ "./views/Settings.vue"),
        },
        {
            path: "/addMedium",
            // route level code-splitting
            // this generates a separate chunk (addMedium.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import(/* webpackChunkName: "add" */ "./views/AddMedium.vue"),
        },
        {
            path: "/addList",
            // route level code-splitting
            // this generates a separate chunk (addList.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import(/* webpackChunkName: "add" */ "./views/AddList.vue"),
        },
        {
            path: "/register",
            // route level code-splitting
            // this generates a separate chunk (register.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import(/* webpackChunkName: "login" */ "./views/Register.vue"),
        },
        {
            path: "/login",
            // route level code-splitting
            // this generates a separate chunk (login.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import(/* webpackChunkName: "login" */ "./views/Login.vue"),
        },
        {
            path: "/readHistory",
            // route level code-splitting
            // this generates a separate chunk (login.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import(/* webpackChunkName: "read" */ "./views/ReadHistory.vue"),
        },
        {
            path: "*",
            // route level code-splitting
            // this generates a separate chunk (login.[hash].js) for this route
            // which is lazy-loaded when the route is visited.
            component: () => import(/* webpackChunkName: "read" */ "./views/ErrorView.vue"),
        }
    ],
});
// fixme remove query from this shit after redirect
export default router;
//# sourceMappingURL=router.js.map