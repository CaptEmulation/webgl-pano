import raf from 'raf';
import { bySceneId } from '../service/scene';
import {
  SCENE_CANVAS_CREATED,
  SCENE_LOAD_START,
  SCENE_LOAD_COMPLETE,
  SCENE_ON_MOUSE_UP,
  SCENE_ON_MOUSE_MOVE,
  SCENE_ON_MOUSE_DOWN,
  SCENE_ROTATION,
  SCENE_UPDATE_MOMENTUM,
  SCENE_UPDATE_MOMENTUM_INTERVAL_ID,
} from './types';
import { createPano } from './pano';
import { createHotspots } from './hotspots';
import {
  createScene,
  createCamera,
  createRenderer,
} from './three';

export function canvasCreated(canvas) {
  return {
    type: SCENE_CANVAS_CREATED,
    payload: canvas,
  };
}

export function sceneLoadComplete(responseData) {
  return {
    type: SCENE_LOAD_COMPLETE,
    payload: responseData,
  };
}

export function sceneLoad(id) {
  return {
    type: SCENE_LOAD_START,
    payload: id,
  };
}

export function fetchScene(id) {
  return (dispatch) => {
    dispatch(sceneLoad(id));
    return bySceneId(id)
      .then(response => response.data)
      .then((sceneData) => {
        dispatch(sceneLoadComplete(sceneData));
        return sceneData;
      });
  };
}

export function buildScene() {
  return (dispatch, getState) => {
    dispatch(createPano());
    dispatch(createHotspots());
    const objects = [];
    objects.push(getState().pano.object3D);
    objects.push(getState().hotspots.object3D);
    dispatch(createScene(objects));
  }
}

export function buildRig() {
  return (dispatch, getState) => {
    const { width, height } = getState().dimensions;
    const { canvas } = getState().scene;
    dispatch(createCamera({ width, height }));
    dispatch(createRenderer({ canvas, width, height }));
  };
}

export function startRenderLoop() {
  return (dispatch, getState) => {
    const { hotspots, pano, three } = getState();
    const { scene, camera, renderer } = three;
    function render() {
      raf(render);
      // hotspots.object3D.rotation.y += 0.01;
      // pano.object3D.rotation.y += 0.01;
      renderer.render(scene, camera);
    }
    raf(render);
  }
}

export function rotate({ x, y }) {
  return (dispatch, getState) => {
    const { hotspots, pano } = getState();

    const radRot = {
      x: (Math.PI * x) / 180,
      y: (Math.PI * y) / 180,
    };

    Object.assign(hotspots.object3D.rotation, radRot);
    Object.assign(pano.object3D.rotation, radRot);

    dispatch({
      type: SCENE_ROTATION,
      payload: { x, y },
    });
  }
}

export function updateMomentumInterval(momentumIntervalId) {
  return {
    type: SCENE_UPDATE_MOMENTUM_INTERVAL_ID,
    payload: momentumIntervalId
  };
}

export function onMouseDown({ top, left }) {
  return {
    type: SCENE_ON_MOUSE_DOWN,
    payload: { top, left },
  };
}

export function onMouseMove({ top, left }) {
  return {
    type: SCENE_ON_MOUSE_MOVE,
    payload: { top, left },
  };
}

export function onMouseUp({ top, left}) {
  return {
    type: SCENE_ON_MOUSE_UP,
    payload: { top, left },
  };
}
