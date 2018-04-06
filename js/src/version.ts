// Import package data to define it only one place
const pkg = require("../package.json");
const module_name = pkg.name;
export const version = pkg.version;

/**
 * The version of the attribute spec that this package
 * implements. This is the value used in
 * _model_module_version/_view_module_version.
 *
 * Update this value when attributes are added/removed from
 * your models, or serialized format changes.
 */
export
const EXTENSION_SPEC_VERSION = '1.0.0';

export
const module_defaults = {
    _model_module : module_name,
    _view_module : module_name,
    _model_module_version : EXTENSION_SPEC_VERSION,
    _view_module_version : EXTENSION_SPEC_VERSION,
};
