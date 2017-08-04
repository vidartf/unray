'use strict';

// This is the one place to change how we import THREE.js

// Import THREE and attach it to window
const THREE = require('three');
window.THREE = THREE;
const OrbitControls = require('../node_modules/three/examples/js/controls/OrbitControls');

//import {THREE} from 'three';
//import THREE from 'three';
//import * as THREE from 'three';
//import '../node_modules/three/examples/js/controls/OrbitControls';

// Let pythreejs import and get THREE from window
// import 'jupyter-threejs';
// const THREE = window.THREE;

// Export to rest of this package
// export default THREE;

module.exports = THREE;
