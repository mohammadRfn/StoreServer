import type { Transition, Variants } from 'framer-motion';

/* -------------------------------------------------------------------------- */
/*  Motion presets – a single source of truth for animation curves            */
/* -------------------------------------------------------------------------- */

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };
export const springSoft: Transition = { type: 'spring', stiffness: 220, damping: 28 };
export const springBouncy: Transition = { type: 'spring', stiffness: 500, damping: 26 };

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: EASE_OUT_EXPO } },
    exit: { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.25, ease: EASE_IN_OUT } },
};

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: 8 },
    show: { opacity: 1, scale: 1, y: 0, transition: spring },
    exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.18, ease: EASE_IN_OUT } },
};

export const stagger = (staggerChildren = 0.05, delayChildren = 0.05): Variants => ({
    hidden: {},
    show: { transition: { staggerChildren, delayChildren } },
    exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
});

export const listItem: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const rowItem: Variants = {
    hidden: { opacity: 0, x: 12 },
    show: { opacity: 1, x: 0, transition: { duration: 0.38, ease: EASE_OUT_EXPO } },
};

export const pageTransition: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT_EXPO, when: 'beforeChildren', staggerChildren: 0.06 } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: EASE_IN_OUT } },
};

export const overlay: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.25 } },
    exit: { opacity: 0, transition: { duration: 0.2, delay: 0.05 } },
};

export const modalPanel: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 24 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } },
    exit: { opacity: 0, scale: 0.97, y: 12, transition: { duration: 0.18, ease: EASE_IN_OUT } },
};

export const drawerPanel: Variants = {
    hidden: { x: '100%' },
    show: { x: 0, transition: { type: 'spring', stiffness: 320, damping: 34 } },
    exit: { x: '100%', transition: { duration: 0.25, ease: EASE_IN_OUT } },
};

export const hoverLift = { y: -2, transition: { duration: 0.2, ease: EASE_OUT_EXPO } };
export const tapPress = { scale: 0.97 };
