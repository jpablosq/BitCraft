<template>

    <aside class="sidebar">

        <div class="logo">
            <h2>BitCraft</h2>
        </div>

        <nav class="menu">

            <router-link
                to="/dashboard"
                class="menu-item"
            >
                Dashboard
            </router-link>

            <router-link
                to="/connectors"
                class="menu-item"
            >
                Conexiones
            </router-link>

            <router-link
                to="/tasks"
                class="menu-item"
            >
                Automatizaciones
            </router-link>

            <router-link
                to="/tasks"
                class="menu-item"
            >
                Historial 
            </router-link>

            <router-link
                to="/profile"
                class="menu-item"
            >
                Perfil
            </router-link>

        </nav>

    </aside>

</template>

<script setup>

import "../../assets/css/sidebar.css";

</script>