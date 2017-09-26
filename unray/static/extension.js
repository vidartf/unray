// This file contains the javascript that is run when the notebook is loaded.
// It contains some requirejs configuration and the `load_ipython_extension`
// which is required for any notebook extension.

define(function() {
    "use strict";
    // Configure requirejs
    if (window.require) {
        window.require.config({
            map: {
                "*" : {
                    "unray": "nbextensions/unray/index",
                    "@jupyter-widgets/base": "nbextensions/jupyter-widgets/extension"
                }
            }
        });
    }

    // Export the required load_ipython_extention
    return {
        load_ipython_extension : function() {}
    };
});
