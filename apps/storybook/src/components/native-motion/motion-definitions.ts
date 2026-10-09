import { defineMotion } from '@opsydyn/crumbs-css/theme/motion';
// Five seconds makes in-flight native presentation observable in qualification.
export const motionDefinition = defineMotion({ states: { resting: { opacity: .6, translateX: 0 }, selected: { opacity: 1, translateX: 112 } }, transition: { duration: 5000, easing: 'ease-in-out' } });
