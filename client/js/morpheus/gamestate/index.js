import reducer from './reducer';
import * as selectors from './selectors';
import * as actions from './actions';
import {
  TEST_TYPES,
} from '../constants';

export function isActive({ cast, gamestates }) {
  const { initiallyEnabled = true, comparators = [] } = cast;
  return comparators.every(({
    gameStateId,
    testType,
    value,
  }) => {
    const gs = gamestates[gameStateId];
    let retValue;
    switch (TEST_TYPES[testType]) {
      case 'EqualTo':
        retValue = gs && (value === gs.value);
        break;
      case 'NotEqualTo':
        retValue = gs && (value !== gs.value);
        break;
      case 'GreaterThan':
        retValue = gs && (value > gs.value);
        break;
      case 'LessThan':
        retValue = gs && (value < gs.value);
        break;
      default:
        retValue = false;
    }
    retValue = initiallyEnabled ? retValue : !retValue;
    return retValue;
  });
}

export {
  selectors,
  reducer,
  actions,
};

export default {
  selectors,
  reducer,
  actions,
};
