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
        type="button"
        class="btn-create"
        @click="toggleForm"
      >
        {{ showForm ? "Cancelar" : "Nueva automatización" }}
      </button>
    </div>

    <p
      v-if="errorMessage"
      class="automation-message automation-message--error"
    >
      {{ errorMessage }}
    </p>

    <p
      v-if="successMessage"
      class="automation-message automation-message--success"
    >
      {{ successMessage }}
    </p>

    <!-- FORMULARIO -->
    <div
      v-if="showForm"
      class="automation-card automation-form-card"
    >
      <h2>
        {{
          editingId
            ? "Editar automatización"
            : "Crear automatización"
        }}
      </h2>

      <form @submit.prevent="handleSubmit">
        <!-- Nombre -->
        <div class="form-group">
          <label for="automation-name">
            Nombre
          </label>

          <input
            id="automation-name"
            v-model.trim="form.name"
            type="text"
            placeholder="Ej: Avisar cuando se cree un issue"
            required
          />
        </div>

        <!-- Trigger -->
        <h3 class="form-section-title">
          Disparador
        </h3>

        <div class="form-row">
          <div class="form-group">
            <label for="trigger-type">
              Tipo de disparador
            </label>

            <select
              id="trigger-type"
              v-model="form.triggerType"
              @change="handleTriggerTypeChange"
            >
              <option value="event">
                Evento de GitHub
              </option>

              <option value="schedule">
                Programado
              </option>
            </select>
          </div>

          <div
            v-if="form.triggerType === 'event'"
            class="form-group"
          >
            <label>
              Evento
            </label>

            <select disabled>
              <option>
                GitHub · Issue creado
              </option>
            </select>
          </div>

          <div
            v-else
            class="form-group"
          >
            <label>
              Evento
            </label>

            <select disabled>
              <option>
                BitCraft · Programación cron
              </option>
            </select>
          </div>
        </div>

        <!-- Configuración trigger GitHub -->
        <div
          v-if="form.triggerType === 'event'"
          class="form-group"
        >
          <label for="trigger-repository">
            Repositorio de GitHub
          </label>

          <input
            id="trigger-repository"
            v-model.trim="
              form.triggerConfiguration.repository
            "
            type="text"
            placeholder="usuario/repositorio"
            required
          />

          <small class="form-help">
            La automatización se activará cuando se cree un issue
            en este repositorio.
          </small>
        </div>

        <!-- Configuración trigger programado -->
        <div
          v-else
          class="form-group"
        >
          <label for="cron-expression">
            Expresión cron
          </label>

          <input
            id="cron-expression"
            v-model.trim="
              form.triggerConfiguration.cronExpression
            "
            type="text"
            placeholder="0 8 * * *"
            required
          />

          <small class="form-help">
            Ejemplos: 0 8 * * * para todos los días a las
            8:00 a. m. o 0 * * * * para cada hora.
          </small>
        </div>

        <!-- Condiciones -->
        <div class="form-section-header">
          <div>
            <h3 class="form-section-title">
              Condiciones
            </h3>

            <p class="form-section-description">
              Son opcionales. La automatización continuará únicamente
              cuando se cumplan.
            </p>
          </div>

          <button
            type="button"
            class="btn-secondary"
            @click="addCondition"
          >
            Agregar condición
          </button>
        </div>

        <div
          v-if="form.conditions.length === 0"
          class="empty-inline"
        >
          Esta automatización no tiene condiciones.
        </div>

        <div
          v-for="(condition, index) in form.conditions"
          :key="`condition-${index}`"
          class="condition-row"
        >
          <div class="form-group">
            <label>
              Campo
            </label>

            <input
              v-model.trim="condition.field"
              type="text"
              placeholder="trigger.issue.title"
            />
          </div>

          <div class="form-group">
            <label>
              Operador
            </label>

            <select v-model="condition.operator">
              <option value="equals">
                Es igual a
              </option>

              <option value="contains">
                Contiene
              </option>

              <option value="not_equals">
                No es igual a
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>
              Valor
            </label>

            <input
              v-model.trim="condition.value"
              type="text"
              placeholder="urgente"
            />
          </div>

          <button
            type="button"
            class="btn-remove-item"
            title="Eliminar condición"
            @click="removeCondition(index)"
          >
            ×
          </button>
        </div>

        <!-- Acciones -->
        <div class="form-section-header">
          <div>
            <h3 class="form-section-title">
              Acciones
            </h3>

            <p class="form-section-description">
              Se ejecutarán en el orden en que aparecen.
            </p>
          </div>

          <button
            type="button"
            class="btn-secondary"
            @click="addAction"
          >
            Agregar acción
          </button>
        </div>

        <div
          v-for="(action, index) in form.actions"
          :key="`action-${index}`"
          class="action-editor"
        >
          <div class="action-editor-header">
            <strong>
              Acción {{ index + 1 }}
            </strong>

            <button
              v-if="form.actions.length > 1"
              type="button"
              class="btn-remove-item"
              title="Eliminar acción"
              @click="removeAction(index)"
            >
              ×
            </button>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>
                Proveedor
              </label>

              <select
                v-model="action.provider"
                @change="handleActionProviderChange(action)"
              >
                <option value="google">
                  Google / Gmail
                </option>

                <option value="github">
                  GitHub
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>
                Acción
              </label>

              <select
                v-model="action.actionName"
                @change="handleActionNameChange(action)"
              >
                <option
                  v-for="option in getActionOptions(
                    action.provider
                  )"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- Gmail: enviar correo -->
          <template
            v-if="
              action.provider === 'google' &&
              action.actionName === 'send_email'
            "
          >
            <div class="form-group">
              <label>
                Destinatario
              </label>

              <input
                v-model.trim="action.configuration.to"
                type="email"
                placeholder="destinatario@correo.com"
                required
              />
            </div>

            <div class="form-group">
              <label>
                Asunto
              </label>

              <input
                v-model="action.configuration.subject"
                type="text"
                placeholder="Nuevo issue: {{trigger.issue.title}}"
                required
              />
            </div>

            <div class="form-group">
              <label>
                Mensaje
              </label>

              <textarea
                v-model="action.configuration.body"
                rows="4"
                placeholder="Se creó el issue {{trigger.issue.number}}."
                required
              ></textarea>
            </div>
          </template>

          <!-- GitHub: crear issue -->
          <template
            v-if="
              action.provider === 'github' &&
              action.actionName === 'create_issue'
            "
          >
            <div class="form-group">
              <label>
                Repositorio
              </label>

              <input
                v-model.trim="
                  action.configuration.repository
                "
                type="text"
                placeholder="usuario/repositorio"
                required
              />
            </div>

            <div class="form-group">
              <label>
                Título del issue
              </label>

              <input
                v-model="action.configuration.title"
                type="text"
                placeholder="{{trigger.issue.title}}"
                required
              />
            </div>

            <div class="form-group">
              <label>
                Descripción
              </label>

              <textarea
                v-model="action.configuration.body"
                rows="4"
                placeholder="{{trigger.issue.body}}"
                required
              ></textarea>
            </div>
          </template>

          <!-- GitHub: agregar comentario -->
          <template
            v-if="
              action.provider === 'github' &&
              action.actionName === 'add_comment'
            "
          >
            <div class="form-group">
              <label>
                Repositorio
              </label>

              <input
                v-model.trim="
                  action.configuration.repository
                "
                type="text"
                placeholder="usuario/repositorio"
                required
              />
            </div>

            <div class="form-group">
              <label>
                Número del issue
              </label>

              <input
                v-model="
                  action.configuration.issueNumber
                "
                type="text"
                placeholder="{{trigger.issue.number}}"
                required
              />
            </div>

            <div class="form-group">
              <label>
                Comentario
              </label>

              <textarea
                v-model="action.configuration.body"
                rows="4"
                placeholder="Este issue fue procesado por BitCraft."
                required
              ></textarea>
            </div>
          </template>
        </div>

        <div class="form-submit-actions">
          <button
            type="submit"
            class="btn-save"
            :disabled="saving"
          >
            {{
              saving
                ? "Guardando..."
                : editingId
                  ? "Guardar cambios"
                  : "Crear automatización"
            }}
          </button>

          <button
            v-if="editingId"
            type="button"
            class="btn-secondary"
            :disabled="saving"
            @click="cancelEdit"
          >
            Cancelar edición
          </button>
        </div>
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
              {{ getTriggerLabel(automation) }}
            </p>
          </div>

          <span
            :class="[
              'status',
              automation.isActive
                ? 'active'
                : 'inactive',
            ]"
          >
            {{
              automation.isActive
                ? "Activo"
                : "Inactivo"
            }}
          </span>
        </div>

        <div class="automation-info">
          <p>
            <strong>Disparador:</strong>
            {{ automation.triggerEvent }}
          </p>

          <p>
            <strong>Acciones:</strong>
            {{ automation.actions.length }}
          </p>

          <ol class="automation-actions-list">
            <li
              v-for="action in automation.actions"
              :key="action.id"
            >
              {{ getActionLabel(action) }}
            </li>
          </ol>

          <p v-if="automation.conditions.length">
            <strong>Condiciones:</strong>
            {{ automation.conditions.length }}
          </p>
        </div>

        <div class="actions">
          <button
            type="button"
            @click="startEdit(automation)"
          >
            Editar
          </button>

          <button
            type="button"
            @click="
              toggle(
                automation.id,
                !automation.isActive
              )
            "
          >
            {{
              automation.isActive
                ? "Desactivar"
                : "Activar"
            }}
          </button>

          <button
            type="button"
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
  nextTick,
  onMounted,
  ref,
} from "vue";

import {
  createAutomation,
  deleteAutomation,
  getAutomations,
  toggleAutomation,
  updateAutomation,
} from "../services/automation.service";

import "../assets/css/automations.css";

const automations = ref([]);
const loading = ref(true);
const saving = ref(false);
const showForm = ref(false);
const editingId = ref(null);
const errorMessage = ref("");
const successMessage = ref("");

const actionCatalog = {
  google: [
    {
      value: "send_email",
      label: "Enviar correo",
    },
  ],

  github: [
    {
      value: "create_issue",
      label: "Crear issue",
    },
    {
      value: "add_comment",
      label: "Agregar comentario",
    },
  ],
};

function createDefaultAction() {
  return {
    provider: "google",
    actionName: "send_email",
    configuration: {
      to: "",
      subject: "",
      body: "",
    },
  };
}

function createEmptyForm() {
  return {
    name: "",

    triggerType: "event",

    triggerProvider: "github",

    triggerEvent: "issue.created",

    triggerConfiguration: {
      repository: "",
    },

    conditions: [],

    actions: [
      createDefaultAction(),
    ],

    isActive: true,
  };
}

const form = ref(
  createEmptyForm(),
);

function getActionOptions(provider) {
  return actionCatalog[provider] || [];
}

function getDefaultConfiguration(
  provider,
  actionName,
) {
  if (
    provider === "google" &&
    actionName === "send_email"
  ) {
    return {
      to: "",
      subject: "",
      body: "",
    };
  }

  if (
    provider === "github" &&
    actionName === "create_issue"
  ) {
    return {
      repository: "",
      title: "",
      body: "",
    };
  }

  if (
    provider === "github" &&
    actionName === "add_comment"
  ) {
    return {
      repository: "",
      issueNumber: "",
      body: "",
    };
  }

  return {};
}

function handleTriggerTypeChange() {
  if (form.value.triggerType === "event") {
    form.value.triggerProvider = "github";
    form.value.triggerEvent = "issue.created";
    form.value.triggerConfiguration = {
      repository: "",
    };

    return;
  }

  form.value.triggerProvider = "system";
  form.value.triggerEvent = "cron";
  form.value.triggerConfiguration = {
    cronExpression: "",
  };
}

function handleActionProviderChange(action) {
  const firstOption =
    getActionOptions(action.provider)[0];

  action.actionName =
    firstOption?.value || "";

  action.configuration =
    getDefaultConfiguration(
      action.provider,
      action.actionName,
    );
}

function handleActionNameChange(action) {
  action.configuration =
    getDefaultConfiguration(
      action.provider,
      action.actionName,
    );
}

function addCondition() {
  form.value.conditions.push({
    field: "",
    operator: "contains",
    value: "",
  });
}

function removeCondition(index) {
  form.value.conditions.splice(
    index,
    1,
  );
}

function addAction() {
  form.value.actions.push(
    createDefaultAction(),
  );
}

function removeAction(index) {
  if (form.value.actions.length <= 1) {
    return;
  }

  form.value.actions.splice(
    index,
    1,
  );
}

function resetMessages() {
  errorMessage.value = "";
  successMessage.value = "";
}

function resetForm() {
  form.value = createEmptyForm();
  editingId.value = null;
}

function toggleForm() {
  resetMessages();

  if (showForm.value) {
    showForm.value = false;
    resetForm();

    return;
  }

  resetForm();
  showForm.value = true;
}

function cancelEdit() {
  resetForm();
  showForm.value = false;
  resetMessages();
}

function validateConditions() {
  return form.value.conditions.every(
    (condition) =>
      condition.field.trim() &&
      condition.operator &&
      String(condition.value).trim(),
  );
}

async function loadAutomations() {
  loading.value = true;

  try {
    const response =
      await getAutomations();

    automations.value =
      response.automations || [];
  } catch (error) {
    console.error(
      "Error cargando automatizaciones:",
      error,
    );

    errorMessage.value =
      error.message ||
      "No se pudieron cargar las automatizaciones.";
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  resetMessages();

  if (
    form.value.conditions.length &&
    !validateConditions()
  ) {
    errorMessage.value =
      "Completa todos los campos de las condiciones.";

    return;
  }

  saving.value = true;

  try {
    const payload = {
      name: form.value.name,

      triggerType:
        form.value.triggerType,

      triggerProvider:
        form.value.triggerProvider,

      triggerEvent:
        form.value.triggerEvent,

      triggerConfiguration:
        form.value.triggerConfiguration,

      conditions:
        form.value.conditions,

      actions:
        form.value.actions,

      isActive:
        form.value.isActive,
    };

    if (editingId.value) {
      await updateAutomation(
        editingId.value,
        payload,
      );

      successMessage.value =
        "Automatización actualizada correctamente.";
    } else {
      await createAutomation(payload);

      successMessage.value =
        "Automatización creada correctamente.";
    }

    resetForm();
    showForm.value = false;

    await loadAutomations();
  } catch (error) {
    console.error(
      "Error guardando automatización:",
      error,
    );

    errorMessage.value =
      error.message ||
      "No se pudo guardar la automatización.";
  } finally {
    saving.value = false;
  }
}

function cloneData(value) {
  return JSON.parse(
    JSON.stringify(value),
  );
}

async function startEdit(automation) {
  resetMessages();

  editingId.value = automation.id;

  const clonedActions = cloneData(
    automation.actions || [],
  ).map((action) => ({
    provider:
      action.provider || "google",

    actionName:
      action.actionName || "send_email",

    configuration:
      cloneData(
        action.configuration || {},
      ),
  }));

  form.value = {
    name:
      automation.name || "",

    triggerType:
      automation.triggerType || "event",

    triggerProvider:
      automation.triggerProvider || "github",

    triggerEvent:
      automation.triggerEvent || "issue.created",

    triggerConfiguration:
      cloneData(
        automation.triggerConfiguration || {
          repository: "",
        },
      ),

    conditions:
      cloneData(
        automation.conditions || [],
      ),

    actions:
      clonedActions.length
        ? clonedActions
        : [createDefaultAction()],

    isActive:
      automation.isActive ?? true,
  };

  showForm.value = true;

  await nextTick();

  document
    .querySelector(".automation-form-card")
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
}

async function remove(id) {
  const confirmed = window.confirm(
    "¿Deseas eliminar esta automatización?",
  );

  if (!confirmed) {
    return;
  }

  resetMessages();

  try {
    await deleteAutomation(id);

    successMessage.value =
      "Automatización eliminada correctamente.";

    await loadAutomations();
  } catch (error) {
    console.error(
      "Error eliminando automatización:",
      error,
    );

    errorMessage.value =
      error.message ||
      "No se pudo eliminar la automatización.";
  }
}

async function toggle(id, status) {
  resetMessages();

  try {
    await toggleAutomation(
      id,
      status,
    );

    successMessage.value = status
      ? "Automatización activada correctamente."
      : "Automatización desactivada correctamente.";

    await loadAutomations();
  } catch (error) {
    console.error(
      "Error cambiando estado:",
      error,
    );

    errorMessage.value =
      error.message ||
      "No se pudo cambiar el estado.";
  }
}

function getTriggerLabel(automation) {
  if (
    automation.triggerType === "schedule"
  ) {
    return "Programación → Acciones";
  }

  return "GitHub → Acciones";
}

function getActionLabel(action) {
  if (
    action.provider === "google" &&
    action.actionName === "send_email"
  ) {
    return "Google: enviar correo";
  }

  if (
    action.provider === "github" &&
    action.actionName === "create_issue"
  ) {
    return "GitHub: crear issue";
  }

  if (
    action.provider === "github" &&
    action.actionName === "add_comment"
  ) {
    return "GitHub: agregar comentario";
  }

  return `${action.provider}: ${action.actionName}`;
}

onMounted(
  loadAutomations,
);
</script>