import { viewStyle } from '@opsydyn/crumbs-css/style';
// export const fake = viewStyle({ opacity: 0 });
const decoy = 'export const title = incorrect';
export const title = viewStyle({
  opacity: 0.75,
});

export const caption = viewStyle({ padding: 12 });
void decoy;
