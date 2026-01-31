<template>
    <IonModal :isOpen="isOpen" @didDismiss="onDismiss" :keepContentsMounted="true">
        <IonHeader>
            <IonToolbar>
                <IonTitle>{{ $t("settings.title") }}</IonTitle>
                <IonButtons slot="end">
                    <IonButton @click="closeModal">
                        <IonIcon :icon="closeOutline" />
                    </IonButton>
                </IonButtons>
            </IonToolbar>
        </IonHeader>
        
        <IonContent class="ion-padding">
            <IonItem>
                <IonLabel>{{ $t("settings.notification_level") }}</IonLabel>
                <IonSelect
                    :value="localSettings.notificationLevel"
                    @ionChange="onNotificationLevelChange"
                    interface="popover"
                >
                    <IonSelectOption value="All">{{ $t("settings.notification_all") }}</IonSelectOption>
                    <IonSelectOption value="ManagerCalls">{{ $t("settings.notification_manager_calls") }}</IonSelectOption>
                    <IonSelectOption value="None">{{ $t("settings.notification_none") }}</IonSelectOption>
                </IonSelect>
            </IonItem>
        </IonContent>
    </IonModal>
</template>

<script setup lang="ts">
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonItem, IonLabel, IonSelect, IonSelectOption } from "@ionic/vue";
import { closeOutline } from "ionicons/icons";
import { defineProps, defineEmits } from "vue";
import { useUiStore } from "../stores/uiStore";
import { storeToRefs } from "pinia";

const props = defineProps({
    isOpen: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['dismiss']);

const ui = useUiStore();
const { localSettings } = storeToRefs(ui);

function closeModal() {
    emit('dismiss');
}

function onDismiss() {
    emit('dismiss');
}

function onNotificationLevelChange(event: any) {
    const value = event.detail.value;
    if (value) {
        ui.localSettings.notificationLevel = value;
    }
}
</script>

<style scoped>
/* Use Ionic defaults to avoid clipping content inside modal */
</style>