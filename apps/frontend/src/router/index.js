import {
  createRouter,
  createWebHistory,
} from "vue-router";

import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import DashboardView from "../views/DashboardView.vue";
import AppLayout from "../layouts/AppLayout.vue";
import ConnectorsView from "../views/ConnectorsView.vue";
import AutomationView from "../views/AutomationView.vue";
import ExecutionHistoryView from "../views/ExecutionHistoryView.vue";

import {
  getCurrentUser,
} from "../services/auth.service";


async function requireAuth() {
  try {
    await getCurrentUser();

    return true;
  } catch {
    return {
      name: "login",
    };
  }
}


const router = createRouter({
  history: createWebHistory(),

  routes: [
    {
      path: "/",
      redirect: {
        name: "login",
      },
    },

    {
      path: "/login",
      name: "login",
      component: LoginView,
    },

    {
      path: "/register",
      name: "register",
      component: RegisterView,
    },

    {
      path: "/",
      component: AppLayout,
      beforeEnter: requireAuth,

      children: [
        {
          path: "dashboard",
          name: "dashboard",
          component: DashboardView,
        },

        {
          path: "connectors",
          name: "connectors",
          component: ConnectorsView,
        },

        {
          path: "automations",
          name: "automations",
          component: AutomationView,
        },

        {
          path: "tasks",
          name: "execution-history",
          component: ExecutionHistoryView,
        },
      ],
    },
  ],
});


export default router;