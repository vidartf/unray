'use strict';

// This is the one place to change how we import THREE.js

// Import THREE and attach it to window
import THREE from 'three';
window.THREE = THREE;

// Let pythreejs import and get THREE from window
// import pythreejs from 'jupyter-threejs';
// const THREE = window.THREE;

// Export to rest of this package
export default THREE;
