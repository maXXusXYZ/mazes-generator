import {SHAPE_SQUARE, EXITS_VERTICAL} from './lib/constants.js';

export function buildModel() {
   const model = {
       shape: SHAPE_SQUARE,
       mask: {},
       algorithmDelay: 0,
       exitConfig: EXITS_VERTICAL
   };

    return model;
}
