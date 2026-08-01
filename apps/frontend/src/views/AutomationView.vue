<template>
  <div class="automation-page">

    <div class="automation-header">
      <div>
        <h1>Automatizaciones</h1>
        <p>
          Gestiona tus flujos automáticos entre tus servicios conectados.
        </p>
      </div>

      <button
        class="btn-create"
        @click="showForm = !showForm"
      >
        {{ showForm ? "Cancelar" : "Nueva automatización" }}
      </button>
    </div>


    <!-- FORMULARIO -->
    <div
      v-if="showForm"
      class="automation-card"
    >

      <h2>
        Crear automatización
      </h2>

      <form @submit.prevent="handleCreate">

        <div class="form-group">
          <label>
            Nombre
          </label>

          <input
            v-model="form.name"
            type="text"
            placeholder="Ej: Crear tarea cuando llegue un correo"
            required
          />
        </div>


        <div class="form-row">

          <div class="form-group">
            <label>
              Trigger Provider
            </label>

            <select v-model="form.triggerProvider">
              <option value="github">
                GitHub
              </option>

              <option value="google">
                Google
              </option>

              <option value="discord">
                Discord
              </option>
            </select>
          </div>


          <div class="form-group">

            <label>
              Evento
            </label>

            <input
              v-model="form.triggerEvent"
              type="text"
              placeholder="issue.created"
              required
            />

          </div>

        </div>


        <div class="form-row">

          <div class="form-group">

            <label>
              Action Provider
            </label>

            <select v-model="form.actionProvider">

              <option value="google">
                Google
              </option>

              <option value="github">
                GitHub
              </option>

              <option value="discord">
                Discord
              </option>

            </select>

          </div>


          <div class="form-group">

            <label>
              Acción
            </label>

            <input
              v-model="form.actionName"
              type="text"
              placeholder="send_email"
              required
            />

          </div>

        </div>


        <button
          class="btn-save"
          type="submit"
        >
          Crear
        </button>

      </form>

    </div>



    <!-- LISTADO -->

    <div class="automation-list">

      <div
        v-if="loading"
        class="empty"
      >
        Cargando automatizaciones...
      </div>


      <div
        v-else-if="automations.length === 0"
        class="empty"
      >
        No tienes automatizaciones creadas.
      </div>


      <div
        v-for="automation in automations"
        :key="automation.id"
        class="automation-card"
      >

        <div class="automation-card-header">

          <div>

            <h2>
              {{ automation.name }}
            </h2>

            <p>
              {{ automation.trigger_provider }}
              →
              {{ automation.action_provider }}
            </p>

          </div>


          <span
            :class="[
              'status',
              automation.is_active
                ? 'active'
                : 'inactive'
            ]"
          >
            {{
              automation.is_active
                ? "Activo"
                : "Inactivo"
            }}
          </span>


        </div>


        <div class="automation-info">

          <p>
            <strong>
              Trigger:
            </strong>

            {{ automation.trigger_event }}
          </p>


          <p>
            <strong>
              Acción:
            </strong>

            {{ automation.action_name }}
          </p>


        </div>


        <div class="actions">

          <button
            @click="
              toggle(
                automation.id,
                !automation.is_active
              )
            "
          >

            {{
              automation.is_active
                ? "Desactivar"
                : "Activar"
            }}

          </button>


          <button
            class="danger"
            @click="remove(automation.id)"
          >
            Eliminar
          </button>

        </div>


      </div>


    </div>


  </div>
</template>


<script setup>

import {
  ref,
  onMounted
} from "vue";


import {
  getAutomations,
  createAutomation,
  deleteAutomation,
  toggleAutomation
} from "../services/automation.service";
import "../assets/css/automations.css";


const automations = ref([]);

const loading = ref(true);

const showForm = ref(false);



const form = ref({

  name: "",

  triggerProvider: "github",

  triggerEvent: "",

  actionProvider: "google",

  actionName: "",

  configuration: {}

});



async function loadAutomations(){

  try {

    const response =
      await getAutomations();


    automations.value =
      response.automations || [];

  }

  catch(error){

    console.error(
      "Error cargando automatizaciones",
      error
    );

  }

  finally{

    loading.value = false;

  }

}




async function handleCreate(){

  try {


    await createAutomation(
      form.value
    );


    form.value = {

      name: "",

      triggerProvider: "github",

      triggerEvent: "",

      actionProvider: "google",

      actionName: "",

      configuration: {}

    };


    showForm.value = false;


    await loadAutomations();


  }

  catch(error){

    console.error(
      "Error creando automatización",
      error
    );

  }

}




async function remove(id){

  try{

    await deleteAutomation(id);

    await loadAutomations();

  }

  catch(error){

    console.error(error);

  }

}




async function toggle(
  id,
  status
){

  try{

    await toggleAutomation(
      id,
      status
    );


    await loadAutomations();

  }

  catch(error){

    console.error(error);

  }

}




onMounted(
  loadAutomations
);


</script>