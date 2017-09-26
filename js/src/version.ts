"use strict";

// Import package data to define it only one place
const pkg = require("../package.json");
const module_name = pkg.name;

// TODO: Follow ipyvolume strategy on versionining?
// same strategy as: ipywidgets/@jupyter-widgets/base/src/widget_core.ts, except we use ~
// so that N.M.x is allowed (we don't care about x, but we assume 0.2.x is not compatible with 0.3.x
//let semver_range = "~" + package.version;
const semver_range = pkg.version;

// Using these defaults for all widgets
export
const module_defaults = {
    _model_module : module_name,
    _view_module : module_name,
    _model_module_version : semver_range,
    _view_module_version : semver_range,
};
