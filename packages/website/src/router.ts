import { createRouter, createWebHistory } from "vue-router";

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
      path: "/news",
      name: "news",
      // route level code-splitting
      // this generates a separate chunk (news.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "news" */ "./views/News.vue"),
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
      props: (to) => {
        return {
          read: to.query.read ? to.query.read === "true" : undefined,
          type: to.query.type ? Number(to.query.type) : 0,
        };
      },
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
      path: "/:pathMatch(.*)*",
      name: "Not Found",
      // route level code-splitting
      // this generates a separate chunk (login.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import(/* webpackChunkName: "read" */ "./views/ErrorView.vue"),
    },
  ],
});
// FIXME remove query from this shit after redirect
export default router;
