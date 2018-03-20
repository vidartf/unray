// Entry point for the notebook bundle containing custom model definitions.
//

// Export the npm package version number
export const version = require("../package.json").version;

// Export widget models and views
export * from "./datawidgets";
export * from "./plotwidgets";
