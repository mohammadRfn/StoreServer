import type { route as ziggyRoute } from 'ziggy-js';

declare global {
    // Ziggy `route()` helper is exposed globally in app.tsx (and by @routes blade directive)
    var route: typeof ziggyRoute;

    interface ImportMetaEnv {
        readonly VITE_APP_NAME?: string;
    }
}

export {};
