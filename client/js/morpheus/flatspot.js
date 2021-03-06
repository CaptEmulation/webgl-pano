import {
  each,
  difference,
} from 'lodash';
import {
  actions as castActions,
  selectors as castSelectors,
} from 'morpheus/casts';
import {
  selectors as sceneSelectors,
} from 'morpheus/scene';
import {
  selectors as inputSelectors,
} from 'morpheus/input';
import {
  actions as gameActions,
  selectors as gameSelectors,
} from 'morpheus/game';
import {
  isActive,
  selectors as gamestateSelectors,
} from 'morpheus/gamestate';
import store from 'store';
import loggerFactory from 'utils/logger';

const logger = loggerFactory('flatspot');

const ORIGINAL_HEIGHT = 400;
const ORIGINAL_WIDTH = 640;
const ORIGINAL_ASPECT_RATIO = ORIGINAL_WIDTH / ORIGINAL_HEIGHT;

export default function ({ dispatch, scene }) {
  const clickStartPos = { left: 0, top: 0 };
  const castSelectorForScene = castSelectors.forScene(scene);
  const castActionsForScene = castActions.forScene(scene);

  let wasActiveHotspots = [];
  const possibleValidClick = false;
  let wasMouseDowned = false;
  let wasMouseMoved = false;
  let wasMouseUpped = false;
  let mouseDown = false;
  let width;
  let height;
  let clipWidth;
  let clipHeight;
  let widthScaler;
  let heightScaler;
  const clip = {
    horizontal: 100,
    vertical: 100,
  };

  function handleHotspotDispatches({
    type,
    top,
    left,
    hotspots,
  }) {
    let cursor = 0;
    hotspots.every((hotspot) => {
      const handled = dispatch(castActionsForScene.special.handleMouseEvent({
        type,
        top,
        left,
        hotspot,
      }));
      if (handled) {
        cursor = handled;
      }
      return handled;
    });
    return cursor;
  }

  function updateState({ clientX, clientY }) {
    const state = store.getState();
    const inputEnabled = inputSelectors.enabled(state);
    if (!inputEnabled) {
      return;
    }
    const location = gameSelectors.location(state);
    const hotspots = castSelectorForScene.special.hotspotData(state);
    const isCurrent = sceneSelectors.currentSceneData(state) === scene;
    const isExiting = castSelectorForScene.isExiting(state);
    const acceptsMouseEvents = isCurrent && !isExiting;
    if (!acceptsMouseEvents) {
      return;
    }
    const nowActiveHotspots = [];
    const left = clientX - location.x;
    const top = clientY - location.y;
    // Update cursor location
    dispatch(gameActions.setCursorLocation({ top, left }));

    const newWidth = gameSelectors.width(store.getState());
    const newHeight = gameSelectors.height(store.getState());

    if (width !== newWidth || height !== newHeight) {
      width = newWidth;
      height = newHeight;
      const onScreenAspectRatio = newWidth / newHeight;
      if (onScreenAspectRatio > ORIGINAL_ASPECT_RATIO) {
        const adjustedHeight = width / ORIGINAL_ASPECT_RATIO;
        clipHeight = adjustedHeight - height;
        clipWidth = 0;
        widthScaler = width / ORIGINAL_WIDTH;
        heightScaler = adjustedHeight / ORIGINAL_HEIGHT;
      } else {
        const adjustedWidth = height * ORIGINAL_ASPECT_RATIO;
        clipWidth = adjustedWidth - width;
        clipHeight = 0;
        widthScaler = adjustedWidth / ORIGINAL_WIDTH;
        heightScaler = height / ORIGINAL_HEIGHT;
      }
    }

    const adjustedClickPos = {
      top: (top + (clipHeight / 2)) / heightScaler,
      left: (left + (clipWidth / 2)) / widthScaler,
    };

    each(hotspots, (hotspot) => {
      const {
        rectTop,
        rectBottom,
        rectLeft,
        rectRight,
      } = hotspot;
      if (adjustedClickPos.top > rectTop
        && adjustedClickPos.top < rectBottom
        && adjustedClickPos.left > rectLeft
        && adjustedClickPos.left < rectRight) {
        nowActiveHotspots.push(hotspot);
      }
    });
    // Update our state
    // logger.info('Handling mouse event', JSON.stringify({
    //   nowActiveHotspots,
    //   wasMouseUpped,
    //   wasMouseMoved,
    //   wasMouseDowned,
    //   adjustedClickPos,
    //   originalClickPos: {
    //     top,
    //     left,
    //   },
    // }, null, 2));
    // Events for hotspots we have left
    handleHotspotDispatches({
      type: 'MouseOver',
      top: adjustedClickPos.top,
      left: adjustedClickPos.left,
      hotspots: nowActiveHotspots,
    });

    handleHotspotDispatches({
      type: 'MouseLeave',
      top: adjustedClickPos.top,
      left: adjustedClickPos.left,
      hotspots: difference(wasActiveHotspots, nowActiveHotspots),
    });

    // Events for hotspots we have entered
    handleHotspotDispatches({
      type: 'MouseEnter',
      top: adjustedClickPos.top,
      left: adjustedClickPos.left,
      hotspots: difference(nowActiveHotspots, wasActiveHotspots),
    });

    // User initiated event inside a hotspot so could be valid
    if (!mouseDown && wasMouseDowned && nowActiveHotspots.length) {
      mouseDown = true;
      handleHotspotDispatches({
        type: 'MouseDown',
        top: adjustedClickPos.top,
        left: adjustedClickPos.left,
        hotspots: nowActiveHotspots,
      });
    }

    if (wasMouseMoved) {
      handleHotspotDispatches({
        type: 'MouseMove',
        top: adjustedClickPos.top,
        left: adjustedClickPos.left,
        hotspots: nowActiveHotspots,
      });
    }

    if (wasMouseMoved && mouseDown) {
      handleHotspotDispatches({
        type: 'MouseStillDown',
        top: adjustedClickPos.top,
        left: adjustedClickPos.left,
        hotspots: nowActiveHotspots,
      });
    }

    // User pressed and released mouse button inside a valid hotspot
    // TODO: debounce??
    if (wasMouseUpped && nowActiveHotspots.length) {
      mouseDown = false;
      handleHotspotDispatches({
        type: 'MouseUp',
        top: adjustedClickPos.top,
        left: adjustedClickPos.left,
        hotspots: nowActiveHotspots,
      });
      handleHotspotDispatches({
        type: 'MouseClick',
        top: adjustedClickPos.top,
        left: adjustedClickPos.left,
        hotspots: nowActiveHotspots,
      });
    }

    handleHotspotDispatches({
      type: 'MouseNone',
      top: adjustedClickPos.top,
      left: adjustedClickPos.left,
      hotspots: difference(hotspots, nowActiveHotspots),
    });

    handleHotspotDispatches({
      type: 'Always',
      top: adjustedClickPos.top,
      left: adjustedClickPos.left,
      hotspots: hotspots
        .filter(h => h.castId === 0),
    });

    nowActiveHotspots.every((hotspot) => {
      // Some special cases
      const gamestates = gamestateSelectors.forState(store.getState());
      if (isActive({ cast: hotspot, gamestates })) {
        const {
          type,
          cursorShapeWhenActive,
        } = hotspot;
        if (wasMouseUpped && type >= 5 && type <= 8) {
          dispatch(gameActions.setOpenHandCursor());
          return false;
        } else if (wasMouseDowned || wasMouseMoved) {
          if (type >= 5 && type <= 8) {
            const currentCursor = gameSelectors.morpheusCursor(store.getState());
            if (currentCursor !== 10009) {
              dispatch(gameActions.setOpenHandCursor());
            }
            return false;
          } else if (cursorShapeWhenActive) {
            dispatch(gameActions.setCursor(cursorShapeWhenActive));
            return false;
          }
        }
      }
      return true;
    });
    wasActiveHotspots = nowActiveHotspots;
    wasMouseMoved = false;
    wasMouseUpped = false;
    wasMouseDowned = false;

    dispatch(castActionsForScene.special.update(scene));
  }

  function onMouseDown(mouseEvent) {
    wasMouseDowned = true;
    updateState(mouseEvent);
  }

  function onMouseMove(mouseEvent) {
    wasMouseMoved = true;
    updateState(mouseEvent);
  }

  function onMouseUp(mouseEvent) {
    wasMouseUpped = true;
    updateState(mouseEvent);
  }

  function onTouchStart({ touches }) {
    if (touches.length) {
      wasMouseDowned = true;
      updateState(touches[0]);
    }
  }

  function onTouchMove({ touches }) {
    if (touches.length) {
      wasMouseMoved = true;
      updateState(touches[0]);
    }
  }

  function onTouchEnd({ touches }) {
    if (touches.length) {
      wasMouseUpped = true;
      updateState(touches[0]);
    }
  }

  function onTouchCancel(/* touchEvent */) {
    // TODO....
  }

  return {
    onMouseUp,
    onMouseMove,
    onMouseDown,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
}
