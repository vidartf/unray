// Entry point for the notebook bundle containing custom model definitions.
//
// Setup notebook base URL
//
// Some static assets may be required by the custom widget javascript. The base
// url for the notebook is not known at build time and is therefore computed
// dynamically.
// eslint-disable-next-line no-undef
declare var __webpack_public_path__: string;
__webpack_public_path__ = document.querySelector("body")!.getAttribute("data-base-url") + "nbextensions/unray/";

// Export the npm package version number
export const version = require("../package.json").version;

// Export widget models and views
export * from "./datawidgets";
export * from "./plotwidgets";
