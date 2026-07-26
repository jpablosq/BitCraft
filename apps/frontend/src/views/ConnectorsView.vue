<template>
  <div class="connectors-page">

    <!-- Header -->
    <header class="connectors-header">
      <div class="connectors-header-inner">
        <div class="connectors-title-group">
          <span class="connectors-badge">Integraciones</span>
          <h1 class="connectors-title">Servicios conectados</h1>
          <p class="connectors-subtitle">
            Vincula tus cuentas externas mediante OAuth para automatizar flujos
            de trabajo y centralizar tu actividad.
          </p>
        </div>
        <div class="connectors-stats">
          <div class="stat-chip">
            <span class="stat-num">{{ connected.length }}</span>
            <span class="stat-label">activos</span>
          </div>
          <div class="stat-chip stat-chip--muted">
            <span class="stat-num">{{ disconnected.length }}</span>
            <span class="stat-label">disponibles</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="connectors-main">

      <!-- Activos -->
      <section v-if="connected.length" class="connectors-section">
        <h2 class="section-label">
          <span class="section-dot section-dot--active"></span>
          Conexiones activas
        </h2>
        <div class="providers-grid">
          <div
            v-for="p in connected"
            :key="p.id"
            class="provider-card provider-card--connected"
          >
            <div class="provider-card-top">
              <div class="provider-icon-wrap" v-html="p.icon"></div>
              <span class="connected-pill">
                <span class="connected-pulse"></span>
                Conectado
              </span>
            </div>
            <div class="provider-info">
              <h3 class="provider-name">{{ p.name }}</h3>
              <p class="provider-desc">{{ p.description }}</p>
            </div>
            <div class="provider-actions">
              <button
                class="btn btn--revoke"
                :disabled="revoking === p.id"
                @click="handleRevoke(p.id)"
              >
                <span v-if="revoking === p.id" class="btn-spinner"></span>
                <template v-else>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                  Revocar acceso
                </template>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Disponibles -->
      <section v-if="disconnected.length" class="connectors-section">
        <h2 class="section-label">
          <span class="section-dot"></span>
          Disponibles para conectar
        </h2>
        <div class="providers-grid">
          <div
            v-for="p in disconnected"
            :key="p.id"
            class="provider-card"
          >
            <div class="provider-card-top">
              <div class="provider-icon-wrap" v-html="p.icon"></div>
            </div>
            <div class="provider-info">
              <h3 class="provider-name">{{ p.name }}</h3>
              <p class="provider-desc">{{ p.description }}</p>
            </div>
            <div class="provider-actions">
              <button
                class="btn btn--connect"
                :disabled="connecting === p.id"
                @click="handleConnect(p.id)"
              >
                <span v-if="connecting === p.id" class="btn-spinner btn-spinner--light"></span>
                <template v-else>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
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
import { ref, computed } from 'vue'

const providers = [
  {
    id: 'google',
    name: 'Google / Gmail',
    description: 'Accede a tu correo, calendario y archivos de Drive.',
    accentText: '#EA4335',
    icon: `<svg viewBox="0 0 48 48" width="36" height="36" fill="none">
      <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
      <path d="M6.306 14.691l6.571 4.819C14.655 16.108 19.000 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
      <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.314 0-9.823-3.317-11.572-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
      <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
    </svg>`,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Gestiona repositorios, issues y pull requests.',
    accentText: '#24292e',
    icon: `<svg viewBox="0 0 24 24" width="36" height="36" fill="#24292e">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>`,
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Integra pipelines, proyectos y merge requests.',
    accentText: '#FC6D26',
    icon: `<svg viewBox="0 0 24 24" width="36" height="36">
      <path d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 00-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 00-.867 0L1.386 9.45.044 13.587a.924.924 0 00.331 1.023L12 23.054l11.625-8.443a.924.924 0 00.33-1.024" fill="#FC6D26"/>
    </svg>`,
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Envía notificaciones y mensajes a tus servidores.',
    accentText: '#5865F2',
    icon: `<svg viewBox="0 0 24 24" width="36" height="36" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>`,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Publica mensajes y recibe alertas en tus canales.',
    accentText: '#4A154B',
    icon: `<svg viewBox="0 0 24 24" width="36" height="36">
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" fill="#4A154B"/>
    </svg>`,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sincroniza páginas, bases de datos y tareas.',
    accentText: '#000000',
    icon: `<svg viewBox="0 0 24 24" width="36" height="36" fill="#000">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </svg>`,
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Gestiona tableros, listas y tarjetas de proyectos.',
    accentText: '#0052CC',
    icon: `<svg viewBox="0 0 24 24" width="36" height="36" fill="#0052CC">
      <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.656 1.343 3 3 3h18c1.656 0 3-1.344 3-3V3c0-1.657-1.344-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v13.62zm10.44-6c0 .795-.645 1.44-1.44 1.44H15c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v7.62z"/>
    </svg>`,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Envía mensajes y notificaciones vía bots de Telegram.',
    accentText: '#26A5E4',
    icon: `<svg viewBox="0 0 24 24" width="36" height="36" fill="#26A5E4">
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>`,
  },
]

const statuses = ref({  })
const connecting = ref(null)
const revoking = ref(null)

const connected = computed(() =>
  providers.filter((p) => statuses.value[p.id] === 'connected')
)
const disconnected = computed(() =>
  providers.filter((p) => statuses.value[p.id] !== 'connected')
)

function handleConnect(id) {
  connecting.value = id
  setTimeout(() => {
    statuses.value = { ...statuses.value, [id]: 'connected' }
    connecting.value = null
  }, 1200)
}

function handleRevoke(id) {
  revoking.value = id
  setTimeout(() => {
    const next = { ...statuses.value }
    delete next[id]
    statuses.value = next
    revoking.value = null
  }, 900)
}
</script>

<style>
@import '../assets/css/connectors.css';
</style>
