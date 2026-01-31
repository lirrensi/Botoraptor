import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '../views/HomePage.vue'
import { getApiKey } from '../services/api'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/home'
    },
    {
        path: '/home',
        name: 'Home',
        component: HomePage
    },
    {
        path: '/home/:botId/:userId?',
        name: 'HomeChat',
        component: HomePage,
        props: true
    },
    {
        path: '/:botId/:userId?',
        name: 'Chat',
        component: HomePage,
        props: true
    }
]

const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),
    routes
})

// Fix for double hash issue - resolve the actual hash
router.resolve = ((originalResolve) => {
    return (to: any) => {
        const resolved = originalResolve.call(router, to);
        // If we have a hash in the path, extract the actual part after #
        if (resolved.href && resolved.href.includes('#')) {
            const parts = resolved.href.split('#');
            if (parts.length > 2) {
                // We have double hash, take the last part
                resolved.href = parts[0] + '#' + parts[parts.length - 1];
            }
        }
        return resolved;
    };
})(router.resolve);

// Route guard to check authentication before processing deeplinks
router.beforeEach((to, from, next) => {
    const hasApiKey = getApiKey();

    // If navigating to a chat route and not authenticated
    if ((to.name === 'Chat' || to.name === 'HomeChat') && !hasApiKey) {
        // Store the intended destination for after authentication
        sessionStorage.setItem('intendedRoute', to.fullPath);
        // Continue to home page where auth modal will be shown
        next('/home');
    } else {
        next();
    }
});


export default router
