import '../css/app.css';
import '@fontsource-variable/vazirmatn';

import { createInertiaApp } from '@inertiajs/react';
import { MotionConfig } from 'framer-motion';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { route as ziggyRoute } from 'ziggy-js';

globalThis.route = ziggyRoute;

const appName = import.meta.env.VITE_APP_NAME || 'StoreServer';

type PageModule = { default: ComponentType & { layout?: (page: ReactNode) => ReactNode } };
const pages = import.meta.glob<PageModule>('./Pages/**/*.tsx');

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: async (name) => {
        const importer = pages[`./Pages/${name}.tsx`];
        if (!importer) throw new Error(`Page not found: ${name}`);
        return (await importer()).default;
    },
    setup({ el, App, props }) {
        if (!el) return;
        createRoot(el).render(
            <MotionConfig reducedMotion="user">
                <App {...props} />
            </MotionConfig>,
        );
    },
    progress: {
        color: '#fbbf24',
        showSpinner: false,
    },
});
