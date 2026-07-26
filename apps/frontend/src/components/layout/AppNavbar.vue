<template>

    <header class="navbar">

        <div class="navbar-left">

            <h3>Dashboard</h3>

        </div>

        <div class="navbar-right">

            <div class="user-info">

                <div
                    v-if="!avatarUrl"
                    class="avatar-placeholder"
                >
                    {{ initials }}
                </div>

                <img
                    v-else
                    :src="avatarUrl"
                    alt="Avatar"
                    class="avatar"
                />

                <div class="user-details">

                    <span class="user-name">
                        {{ userName }}
                    </span>

                    <span class="user-email">
                        {{ userEmail }}
                    </span>

                </div>

            </div>

            <button
                class="logout-btn"
                @click="handleLogout"
            >
                Cerrar sesión
            </button>

        </div>

    </header>

</template>

<script setup>

import "../../assets/css/navbar.css";

import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";

import {
    getCurrentUser,
    logout
} from "../../services/auth.service";

const router = useRouter();

const userName = ref("");
const userEmail = ref("");
const avatarUrl = ref("");

const initials = computed(() => {

    if (!userName.value) {
        return "";
    }

    return userName.value
        .split(" ")
        .map(name => name[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

});

onMounted(async () => {
    try {

        const user = await getCurrentUser();

        console.log(user);

        userName.value = user.name;
        userEmail.value = user.email;
        avatarUrl.value = user.avatar_url ?? "";

    } catch (error) {

        console.error(error);

    }
});

async function handleLogout() {

    try {

        if (logout) {
            await logout();
        }

    } catch (error) {

        console.error(error);

    } finally {

        router.push("/login");

    }

}

</script>