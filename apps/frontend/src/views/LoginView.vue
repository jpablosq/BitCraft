<template>
  <div class="login-container">
    <div class="login-card">
      <h1>BitCraft</h1>
      <p>Inicia sesión para continuar</p>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Correo electrónico</label>

          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="correo@ejemplo.com"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>

          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="********"
            minlength="8"
            required
          />
        </div>

        <p
          v-if="error"
          class="error"
        >
          {{ error }}
        </p>

        <button
          class="login-btn"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? "Iniciando sesión..." : "Iniciar sesión" }}
        </button>
      </form>

      <div class="footer">
        ¿No tienes una cuenta?

        <router-link to="/register">
          Regístrate
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import "../assets/css/login.css";

import { ref } from "vue";
import { useRouter } from "vue-router";

import { login } from "../services/auth.service";

const router = useRouter();

const email = ref("");
const password = ref("");

const loading = ref(false);
const error = ref("");

async function handleLogin() {
  loading.value = true;
  error.value = "";

  try {
    await login(
      email.value.trim().toLowerCase(),
      password.value,
    );

    router.push("/dashboard");
  } catch (err) {
    error.value =
      err.response?.data?.message ??
      "No fue posible iniciar sesión";
  } finally {
    loading.value = false;
  }
}
</script>