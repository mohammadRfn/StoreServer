import { animate, useInView, useMotionValue } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/** Animated number that counts up when it enters the viewport. */
export function useCountUp(target: number, duration = 1.2) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, margin: '-40px' });
    const mv = useMotionValue(0);
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const controls = animate(mv, target, {
            duration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => setValue(Math.round(v)),
        });
        return () => controls.stop();
    }, [inView, target, duration, mv]);

    return { ref, value };
}
