<template>
  <div class="register-container">

    <div class="register-card">

      <h1>Crear cuenta</h1>

      <p>
        Únete a BitCraft
      </p>


      <form @submit.prevent="handleRegister">


        <div class="form-group">

          <label>
            Nombre completo
          </label>

          <input
            type="text"
            v-model="name"
            placeholder="Nombre completo"
            required
          />

        </div>



        <div class="form-group">

          <label>
            Correo electrónico
          </label>

          <input
            type="email"
            v-model="email"
            placeholder="correo@ejemplo.com"
            required
          />

        </div>



        <div class="form-group">

          <label>
            Contraseña
          </label>

          <input
            type="password"
            v-model="password"
            placeholder="********"
            required
          />

        </div>



        <div class="form-group">

          <label>
            Confirmar contraseña
          </label>

          <input
            type="password"
            v-model="confirmPassword"
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
          class="register-btn"
          type="submit"
          :disabled="loading"
        >

          {{
            loading
            ? "Creando cuenta..."
            : "Crear cuenta"
          }}

        </button>


      </form>



      <div class="divider">

        <span>
          o regístrate con
        </span>

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

const email = ref("");

const password = ref("");

const confirmPassword = ref("");



const loading = ref(false);

const error = ref("");




async function handleRegister(){


  error.value = "";



  if(password.value !== confirmPassword.value){

    error.value = "Las contraseñas no coinciden";

    return;

  }



  try{


    loading.value = true;



    const response = await register(

      name.value,

      email.value,

      password.value

    );



    console.log(response);





    router.push("/login");



  }catch(err){



    console.log(err);



    error.value =

      err.response?.data?.message ??

      "No fue posible crear la cuenta";



  }finally{


    loading.value = false;


  }


}



</script>