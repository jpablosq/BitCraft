<template>
  <div class="execution-page">
    <header class="execution-header">
      <div>
        <h1>Historial de ejecuciones</h1>

        <p>
          Consulta el estado y los resultados de tus automatizaciones.
        </p>
      </div>

      <button
        type="button"
        class="execution-refresh-button"
        :disabled="loading"
        @click="loadExecutions"
      >
        {{ loading ? "Actualizando..." : "Actualizar" }}
      </button>
    </header>

    <p
      v-if="errorMessage"
      class="execution-message execution-message--error"
    >
      {{ errorMessage }}
    </p>

    <section class="execution-filters">
      <div class="execution-filter">
        <label for="automation-filter">
          Automatización
        </label>

        <select
          id="automation-filter"
          v-model="selectedAutomationId"
          @change="loadExecutions"
        >
          <option value="">
            Todas las automatizaciones
          </option>

          <option
            v-for="automation in automations"
            :key="automation.id"
            :value="String(automation.id)"
          >
            {{ automation.name }}
          </option>
        </select>
      </div>

      <div class="execution-filter">
        <label for="execution-limit">
          Cantidad de registros
        </label>

        <select
          id="execution-limit"
          v-model.number="limit"
          @change="loadExecutions"
        >
          <option :value="10">
            10
          </option>

          <option :value="25">
            25
          </option>

          <option :value="50">
            50
          </option>

          <option :value="100">
            100
          </option>
        </select>
      </div>
    </section>

    <div
      v-if="loading"
      class="execution-empty"
    >
      Cargando historial...
    </div>

    <div
      v-else-if="executions.length === 0"
      class="execution-empty"
    >
      No hay ejecuciones registradas.
    </div>

    <section
      v-else
      class="execution-list"
    >
      <article
        v-for="execution in executions"
        :key="execution.id"
        class="execution-card"
      >
        <div class="execution-card-header">
          <div>
            <h2>
              {{ execution.automation_name }}
            </h2>

            <p>
              Ejecución #{{ execution.id }}
            </p>
          </div>

          <span
            :class="[
              'execution-status',
              `execution-status--${getStatusClass(execution.status)}`,
            ]"
          >
            {{ getStatusLabel(execution.status) }}
          </span>
        </div>

        <div class="execution-summary">
          <div>
            <span>Fecha</span>

            <strong>
              {{ formatDate(execution.created_at) }}
            </strong>
          </div>

          <div>
            <span>Intentos</span>

            <strong>
              {{ execution.attempts ?? 0 }}
            </strong>
          </div>

          <div>
            <span>Duración</span>

            <strong>
              {{ formatDuration(execution.duration_ms) }}
            </strong>
          </div>
        </div>

        <p
          v-if="execution.error_message"
          class="execution-error"
        >
          <strong>Error:</strong>
          {{ execution.error_message }}
        </p>

        <button
          type="button"
          class="execution-detail-button"
          @click="toggleDetails(execution.id)"
        >
          {{
            expandedExecutionId === execution.id
              ? "Ocultar detalle"
              : "Ver detalle"
          }}
        </button>

        <div
          v-if="expandedExecutionId === execution.id"
          class="execution-details"
        >
          <div class="execution-detail-block">
            <h3>Datos de entrada</h3>

            <pre>{{ formatJson(execution.input_data) }}</pre>
          </div>

          <div class="execution-detail-block">
            <h3>Resultado</h3>

            <pre>{{ formatJson(execution.output_data) }}</pre>
          </div>

          <div class="execution-detail-grid">
            <div>
              <span>Inicio</span>

              <strong>
                {{ formatDate(execution.started_at) }}
              </strong>
            </div>

            <div>
              <span>Finalización</span>

              <strong>
                {{ formatDate(execution.finished_at) }}
              </strong>
            </div>
          </div>

          <div class="execution-idempotency">
            <span>Clave de idempotencia</span>

            <code>
              {{ execution.idempotency_key }}
            </code>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import {
  onMounted,
  ref,
} from "vue";

import {
  getAutomations,
  getAutomationExecutions,
} from "../services/automation.service";

import "../assets/css/execution-history.css";

const executions = ref([]);
const automations = ref([]);
const loading = ref(true);
const errorMessage = ref("");
const selectedAutomationId = ref("");
const expandedExecutionId = ref(null);
const limit = ref(50);

async function loadAutomations() {
  const response = await getAutomations();

  automations.value =
    response.automations || [];
}

async function loadExecutions() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response =
      await getAutomationExecutions({
        automationId:
          selectedAutomationId.value || null,

        limit:
          limit.value,
      });

    executions.value =
      response.executions || [];
  } catch (error) {
    console.error(
      "Error cargando ejecuciones:",
      error,
    );

    errorMessage.value =
      error.message ||
      "No se pudo cargar el historial.";
  } finally {
    loading.value = false;
  }
}

function toggleDetails(executionId) {
  expandedExecutionId.value =
    expandedExecutionId.value === executionId
      ? null
      : executionId;
}

function getStatusClass(status) {
  const normalizedStatus =
    String(status || "").toLowerCase();

  if (
    ["success", "completed"].includes(
      normalizedStatus,
    )
  ) {
    return "success";
  }

  if (
    ["failed", "error"].includes(
      normalizedStatus,
    )
  ) {
    return "failed";
  }

  if (
    ["processing", "running"].includes(
      normalizedStatus,
    )
  ) {
    return "processing";
  }

  return "pending";
}

function getStatusLabel(status) {
  const labels = {
    pending: "Pendiente",
    queued: "En cola",
    processing: "Procesando",
    running: "Procesando",
    success: "Exitosa",
    completed: "Exitosa",
    failed: "Fallida",
    error: "Fallida",
  };

  return labels[
    String(status || "").toLowerCase()
  ] || status || "Desconocido";
}

function formatDate(value) {
  if (!value) {
    return "No disponible";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha inválida";
  }

  return new Intl.DateTimeFormat(
    "es-CR",
    {
      dateStyle: "medium",
      timeStyle: "medium",
    },
  ).format(date);
}

function formatDuration(durationMs) {
  if (
    durationMs === null ||
    durationMs === undefined
  ) {
    return "No disponible";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(
    durationMs / 1000
  ).toFixed(2)} s`;
}

function formatJson(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Sin información";
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  return JSON.stringify(
    value,
    null,
    2,
  );
}

onMounted(async () => {
  try {
    await loadAutomations();
  } catch (error) {
    console.error(
      "Error cargando automatizaciones:",
      error,
    );
  }

  await loadExecutions();
});
</script>