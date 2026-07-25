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
            type="email"
            v-model="email"
            placeholder="correo@ejemplo.com"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>

          <input
            id="password"
            type="password"
            v-model="password"
            placeholder="********"
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

      <div class="divider">
        <span>o continúa con</span>
      </div>

      <div class="social-buttons">

        <button
          type="button"
          class="google-btn"
          @click="loginGoogle"
        >
          <img
            src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
            alt="Google"
          />

          Continuar con Google
        </button>

        <button
          type="button"
          class="github-btn"
          @click="loginGithub"
        >
          <img
            src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg"
            alt="GitHub"
          />

          Continuar con GitHub
        </button>

      </div>

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

async function handleLogin(){

    loading.value=true;
    error.value="";

    try{

        await login(
            email.value,
            password.value
        );

        router.push("/dashboard");

    }catch(err){

        error.value=
            err.response?.data?.message ??
            "No fue posible iniciar sesión";

    }finally{

        loading.value=false;

    }

}

function loginGoogle(){

    window.location.href="http://localhost:3000/api/auth/google";

}

function loginGithub(){

    window.location.href="http://localhost:3000/api/auth/github";

}

</script>