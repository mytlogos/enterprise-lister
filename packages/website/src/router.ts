import { getActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import { userHydrated, useUserStore } from "./store/store";

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  linkActiveClass: "active",
  routes: [
    {
      path: "/home",
      name: "home",
      alias: "/",
      component: () => import(/* webpackChunkName: "lists" */ "./views/Home.vue"),
    },
    {
      path: "/list",
      name: "lists",
      component: () => import(/* webpackChunkName: "lists" */ "./views/Lists.vue"),
    },
    {
      path: "/settings",
      name: "settings",
      // route level code-splitting
      // this generates a separate chunk (settings.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "settings" */ "./views/Settings.vue"),
    },
    {
      path: "/addMedium",
      name: "addMedium",
      // route level code-splitting
      // this generates a separate chunk (addMedium.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "add" */ "./views/AddMedium.vue"),
    },
    {
      path: "/addList",
      name: "addList",
      // route level code-splitting
      // this generates a separate chunk (addList.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "add" */ "./views/AddList.vue"),
    },
    {
      path: "/register",
      name: "register",
      // route level code-splitting
      // this generates a separate chunk (register.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "login" */ "./views/Register.vue"),
    },
    {
      path: "/login",
      name: "login",
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "login" */ "./views/Login.vue"),
    },
    {
      path: "/readHistory",
      name: "readHistory",
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "read" */ "./views/ReadHistory.vue"),
    },
    {
      path: "/releases",
      name: "releases",
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "read" */ "./views/Releases.vue"),
    },
    {
      path: "/media",
      name: "media",
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "read" */ "./views/Media.vue"),
    },
    {
      path: "/unusedMedia",
      name: "media-in-wait",
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "read" */ "./views/MediaInWait.vue"),
    },
    {
      path: "/medium/:id",
      name: "medium",
      props: (to) => {
        return {
          id: Number.parseInt(to.params.id as string),
        };
      },
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "read" */ "./views/MediumDetail.vue"),
    },
    {
      path: "/admin",
      name: "admin",
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "admin" */ "./views/Administration.vue"),

      children: [
        {
          path: "",
          name: "status",
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/ServerStatus.vue"),
        },
        {
          path: "jobsStat",
          name: "job-stats",
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/JobStatistic.vue"),
        },
        {
          path: "jobs",
          name: "jobs",
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/Jobs.vue"),
        },
        {
          path: "jobs/:jobId",
          name: "job",
          props: (to) => {
            return {
              id: Number.parseInt(to.params.jobId as string),
            };
          },
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/JobDetail.vue"),
        },
        {
          path: "hooks",
          name: "hooks",
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/HooksView.vue"),
        },
        {
          path: "history",
          name: "jobhistory",
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/JobHistory.vue"),
        },
        {
          path: "live",
          name: "joblive",
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/LiveJobs.vue"),
        },
        {
          path: "addHook",
          name: "addHook",
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/CustomHookView.vue"),
        },
        {
          path: "addHookV2",
          name: "addHookV2",
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/CustomHookViewV2.vue"),
        },
        {
          path: "editHook/:hookId(\\d+)",
          name: "editHook",
          props: (to) => {
            return {
              id: Number.parseInt(to.params.hookId as string),
            };
          },
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/CustomHookView.vue"),
        },
        {
          path: "editHookv2/:hookId(\\d+)",
          name: "editHookv2",
          props: (to) => ({ id: Number.parseInt(to.params.hookId as string) }),
          // route level code-splitting
          // this generates a separate chunk (login.[hash].js) for this route
          // which is lazy-loaded when the route is visited.
          component: () => import(/* webpackChunkName: "admin" */ "./views/CustomHookViewV2.vue"),
        },
      ],
    },
    {
      path: "/search",
      name: "search",
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "read" */ "./views/Search.vue"),
    },
    {
      path: "/notifications",
      name: "notifications",
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "read" */ "./views/Notifications.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      name: "Not Found",
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "read" */ "./views/ErrorView.vue"),
    },
  ],
});

let userStore: ReturnType<typeof useUserStore> | undefined;

router.beforeEach(async (to) => {
  userStore ??= useUserStore(getActivePinia());

  await userHydrated;

  if (!userStore.loggedIn && (!to.name || !["login", "register"].includes(to.name.toString()))) {
    return { name: "login" };
  }
});

export default router;
