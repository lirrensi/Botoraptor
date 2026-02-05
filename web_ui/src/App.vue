<template>
    <ion-app>
        <ion-router-outlet />
        <AuthModal
            v-if="showAuth"
            @authenticated="onAuthenticated"
        />
    </ion-app>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { IonApp, IonRouterOutlet } from "@ionic/vue";
import AuthModal from "./components/AuthModal.vue";
import { getApiKey } from "./services/api";
import { useUiStore } from "./stores/uiStore";

const showAuth = ref(!getApiKey());
const ui = useUiStore();

function onAuthenticated() {
    showAuth.value = false;
    // notify other parts of the app (e.g. HomePage) that authentication happened
    // so they can reload data without forcing a full page reload
    window.dispatchEvent(new Event("authenticated"));
    
    // Check for intended route after authentication
    const intendedRoute = sessionStorage.getItem('intendedRoute');
    if (intendedRoute) {
        // The HomePage component will handle the navigation
        // Just clear the storage here
        sessionStorage.removeItem('intendedRoute');
    }
    
    // Apply theme settings after authentication
    ui.applyThemeSettings();
}
 
function onAuthRequired() {
    // When api layer detects 401/403 it will clear the key and dispatch "authRequired".
    // Make the modal visible so user can re-authenticate.
    showAuth.value = true;
}
 
onMounted(() => {
    window.addEventListener("authRequired", onAuthRequired);
});
 
onUnmounted(() => {
    window.removeEventListener("authRequired", onAuthRequired);
});
</script>
