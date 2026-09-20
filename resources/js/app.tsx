import '../css/app.css';
import '@fontsource-variable/vazirmatn';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { route as ziggyRoute } from 'ziggy-js';

globalThis.route = ziggyRoute;

const appName = import.meta.env.VITE_APP_NAME || 'StoreServer';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent<{ default: ComponentType }>(
            `./Pages/${name}.tsx`,
            import.meta.glob<{ default: ComponentType }>('./Pages/**/*.tsx'),
        ).then((page) => page.default),
    setup({ el, App, props }) {
        if (!el) {
            return;
        }

        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#f59e0b',
    },
});