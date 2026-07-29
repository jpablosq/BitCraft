<template>
  <div class="connectors-page">
    <!-- Header -->
    <header class="connectors-header">
      <div class="connectors-header-inner">
        <div class="connectors-title-group">
          <span class="connectors-badge">Integraciones</span>

          <h1 class="connectors-title">
            Servicios conectados
          </h1>

          <p class="connectors-subtitle">
            Vincula tus cuentas externas mediante OAuth para automatizar flujos
            de trabajo y centralizar tu actividad.
          </p>
        </div>

        <div class="connectors-stats">
          <div class="stat-chip">
            <span class="stat-num">
              {{ loading ? '—' : connected.length }}
            </span>

            <span class="stat-label">
              activos
            </span>
          </div>

          <div class="stat-chip stat-chip--muted">
            <span class="stat-num">
              {{ loading ? '—' : disconnected.length }}
            </span>

            <span class="stat-label">
              disponibles
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="connectors-main">
      <!-- Estado de carga -->
      <p
        v-if="loading"
        class="connectors-message"
      >
        Cargando conexiones...
      </p>

      <!-- Mensaje de error -->
      <p
        v-if="errorMessage"
        class="connectors-message connectors-message--error"
      >
        {{ errorMessage }}
      </p>

      <!-- Conexiones activas -->
      <section
        v-if="!loading && connected.length"
        class="connectors-section"
      >
        <h2 class="section-label">
          <span class="section-dot section-dot--active"></span>
          Conexiones activas
        </h2>

        <div class="providers-grid">
          <div
            v-for="provider in connected"
            :key="provider.id"
            class="provider-card provider-card--connected"
          >
            <div class="provider-card-top">
              <div
                class="provider-icon-wrap"
                v-html="provider.icon"
              ></div>

              <span class="connected-pill">
                <span class="connected-pulse"></span>
                Conectado
              </span>
            </div>

            <div class="provider-info">
              <h3 class="provider-name">
                {{ provider.name }}
              </h3>

              <p class="provider-desc">
                {{ provider.description }}
              </p>

              <div
                v-if="provider.connection"
                class="provider-account"
              >
                <span
                  v-if="provider.connection.accountName"
                  class="provider-account-name"
                >
                  {{ provider.connection.accountName }}
                </span>

                <span
                  v-if="
                    provider.connection.accountName &&
                    provider.connection.accountEmail
                  "
                  class="provider-account-separator"
                >
                  ·
                </span>

                <span
                  v-if="provider.connection.accountEmail"
                  class="provider-account-email"
                >
                  {{ provider.connection.accountEmail }}
                </span>
              </div>
            </div>

            <div class="provider-actions">
              <button
                type="button"
                class="btn btn--revoke"
                :disabled="revoking === provider.id"
                @click="handleRevoke(provider.id)"
              >
                <span
                  v-if="revoking === provider.id"
                  class="btn-spinner"
                ></span>

                <template v-else>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>

                  Revocar acceso
                </template>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Servicios disponibles -->
      <section
        v-if="!loading && disconnected.length"
        class="connectors-section"
      >
        <h2 class="section-label">
          <span class="section-dot"></span>
          Disponibles para conectar
        </h2>

        <div class="providers-grid">
          <div
            v-for="provider in disconnected"
            :key="provider.id"
            class="provider-card"
          >
            <div class="provider-card-top">
              <div
                class="provider-icon-wrap"
                v-html="provider.icon"
              ></div>
            </div>

            <div class="provider-info">
              <h3 class="provider-name">
                {{ provider.name }}
              </h3>

              <p class="provider-desc">
                {{ provider.description }}
              </p>
            </div>

            <div class="provider-actions">
              <button
                type="button"
                class="btn btn--connect"
                :disabled="connecting === provider.id"
                @click="handleConnect(provider.id)"
              >
                <span
                  v-if="connecting === provider.id"
                  class="btn-spinner btn-spinner--light"
                ></span>

                <template v-else>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                    />
                    <path
                      d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                    />
                  </svg>

                  Conectar
                </template>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const API_URL = 'http://localhost:3000/api/connections'

const providers = [
  {
    id: 'google',
    name: 'Google / Gmail',
    description: 'Envía correos electrónicos desde tu cuenta de Gmail.',
    accentText: '#EA4335',
    icon: `
      <svg
        viewBox="0 0 48 48"
        width="36"
        height="36"
        fill="none"
      >
        <path
          d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
          fill="#FFC107"
        />
        <path
          d="M6.306 14.691l6.571 4.819C14.655 16.108 19.000 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
          fill="#FF3D00"
        />
        <path
          d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.314 0-9.823-3.317-11.572-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
          fill="#4CAF50"
        />
        <path
          d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
          fill="#1976D2"
        />
      </svg>
    `,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Gestiona repositorios, issues y comentarios.',
    accentText: '#24292e',
    icon: `
      <svg
        viewBox="0 0 24 24"
        width="36"
        height="36"
        fill="#24292e"
      >
        <path
          d="M12 0C5.37 0 0 5.37 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z"
        />
      </svg>
    `,
  },
]

const connections = ref([])
const connecting = ref(null)
const revoking = ref(null)
const loading = ref(true)
const errorMessage = ref('')

function findConnection(providerId) {
  return connections.value.find(
    (connection) => connection.provider === providerId,
  )
}

const connected = computed(() => {
  return providers
    .filter((provider) => findConnection(provider.id))
    .map((provider) => ({
      ...provider,
      connection: findConnection(provider.id),
    }))
})

const disconnected = computed(() => {
  return providers.filter(
    (provider) => !findConnection(provider.id),
  )
})

async function loadConnections() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      credentials: 'include',
    })

    const data = await response.json().catch(() => ({}))

    if (response.status === 401) {
      window.location.href = '/login'
      return
    }

    if (!response.ok) {
      throw new Error(
        data.message || 'No se pudieron cargar las conexiones.',
      )
    }

    connections.value = Array.isArray(data.connections)
      ? data.connections
      : []
  } catch (error) {
    console.error('Error al cargar conexiones:', error)

    errorMessage.value =
      error.message ||
      'No se pudieron cargar las conexiones.'
  } finally {
    loading.value = false
  }
}

function handleConnect(providerId) {
  connecting.value = providerId
  errorMessage.value = ''

  window.location.assign(
    `${API_URL}/${providerId}`,
  )
}

async function handleRevoke(providerId) {
  revoking.value = providerId
  errorMessage.value = ''

  try {
    const response = await fetch(
      `${API_URL}/${providerId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    )

    const data = await response.json().catch(() => ({}))

    if (response.status === 401) {
      window.location.href = '/login'
      return
    }

    if (!response.ok) {
      throw new Error(
        data.message || 'No se pudo revocar la conexión.',
      )
    }

    await loadConnections()
  } catch (error) {
    console.error('Error al revocar conexión:', error)

    errorMessage.value =
      error.message ||
      'No se pudo revocar la conexión.'
  } finally {
    revoking.value = null
  }
}

onMounted(() => {
  loadConnections()
})
</script>

<style>
@import '../assets/css/connectors.css';
</style>