<template>

    <div class="app-layout">

        <AppSidebar />

        <div class="app-content">

            <AppNavbar />

            <main>

                <router-view />

            </main>

        </div>

    </div>

</template>

<script setup>
import "../assets/css/dashboard.css";

import AppNavbar from "../components/layout/AppNavbar.vue";
import AppSidebar from "../components/layout/AppSidebar.vue";

</script>