<template>
  <main class="dashboard">
    <p v-if="loading">
      Cargando usuario...
    </p>

    <p
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </p>

    <section v-else-if="user">
      <div class="user-info">
        <img
          v-if="user.avatarUrl"
          :src="user.avatarUrl"
          :alt="`Foto de ${user.username}`"
          class="avatar"
        />

        <div
          v-else
          class="avatar-placeholder"
        >
          {{ user.username.charAt(0).toUpperCase() }}
        </div>

        <div>
          <h1>Hola, {{ user.name }}</h1>
          <p>@{{ user.username }}</p>
          <p>{{ user.email }}</p>
        </div>
      </div>

      <button
        type="button"
        :disabled="loggingOut"
        @click="handleLogout"
      >
        {{ loggingOut ? "Cerrando sesión..." : "Cerrar sesión" }}
      </button>
    </section>
  </main>
</template>

<script setup>
import {
  onMounted,
  ref,
} from "vue";

import { useRouter } from "vue-router";

import {
  getCurrentUser,
  logout,
} from "../services/auth.service";

const router = useRouter();

const user = ref(null);
const loading = ref(true);
const loggingOut = ref(false);
const error = ref("");

async function loadCurrentUser() {
  try {
    const response = await getCurrentUser();

    user.value = response.user;
  } catch {
    await router.replace({
      name: "login",
    });
  } finally {
    loading.value = false;
  }
}

async function handleLogout() {
  error.value = "";
  loggingOut.value = true;

  try {
    await logout();

    await router.replace({
      name: "login",
    });
  } catch (err) {
    error.value =
      err.response?.data?.message ??
      "No fue posible cerrar la sesión";
  } finally {
    loggingOut.value = false;
  }
}

onMounted(loadCurrentUser);
</script>