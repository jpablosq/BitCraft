<template>
  <div class="register-container">
    <div class="register-card">
      <h1>Crear cuenta</h1>

      <p>Únete a BitCraft</p>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="name">Nombre completo</label>

          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Nombre completo"
            required
          />
        </div>

        <div class="form-group">
          <label for="username">Nombre de usuario</label>

          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Ejemplo: pablosq"
            minlength="3"
            maxlength="50"
            required
          />
        </div>

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

        <div class="form-group">
          <label for="confirmPassword">
            Confirmar contraseña
          </label>

          <input
            id="confirmPassword"
            v-model="confirmPassword"
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
          class="register-btn"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? "Creando cuenta..." : "Crear cuenta" }}
        </button>
      </form>

      <div class="footer">
        ¿Ya tienes una cuenta?

        <router-link to="/login">
          Inicia sesión
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

import { register } from "../services/auth.service";
import "../assets/css/register.css";

const router = useRouter();

const name = ref("");
const username = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

const loading = ref(false);
const error = ref("");

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

async function handleRegister() {
  error.value = "";

  const normalizedUsername = username.value
    .trim()
    .toLowerCase();

  if (
    normalizedUsername.length < 3 ||
    normalizedUsername.length > 50
  ) {
    error.value =
      "El nombre de usuario debe tener entre 3 y 50 caracteres";

    return;
  }

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    error.value =
      "El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos";

    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = "Las contraseñas no coinciden";

    return;
  }

  try {
    loading.value = true;

    await register(
      name.value.trim(),
      normalizedUsername,
      email.value.trim().toLowerCase(),
      password.value,
    );

    router.push("/login");
  } catch (err) {
    console.error(err);

    error.value =
      err.response?.data?.message ??
      "No fue posible crear la cuenta";
  } finally {
    loading.value = false;
  }
}
</script>