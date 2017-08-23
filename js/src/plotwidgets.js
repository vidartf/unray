'use strict';

// TODO: Add classes mirroring plotwidgets.py here

// TODO: Remove data.js, figure.js, plot.js once replacements are up


import widgets from '@jupyter-widgets/base';

//import _ from 'underscore';

import version from './version';

import {create_unray_state} from './renderer';


// Create model class based on this data flow:
//    end-user updates data on python widget
// -> widgets subsystems do their magic
// -> model.on_change() is called
// -> model.state.update()  // this can be piecewise in a promise chain
// -> model.state.subscene.update()  // this must be a self consistent scene update
// -> somehow(tm) trigger refresh so renderer redraws stuff
//    (to avoid multiple refreshes in complex scenarios,
//     consider a "with renderer.hold_render()" pattern?)

class PlotModel extends widgets.DOMWidgetModel {  // FIXME: Extend Blackbox here
    defaults() {
        return Object.assign(super.defaults(), version.module_defaults);
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);

        if (this.obj === undefined) {
            console.warn("Creating unattached this.obj until blackbox design is completed.");
            this.obj = new THREE.Object3D();
        }

        // Get any change events
        this.on('change', this.onChange, this);

        // Initialize subclass plot state, this.obj is the root created by pythreejs blackbox
        this.plotstate = this.createInitialPlotState(this.obj, attributes);
    }

    onChange(model, options) {
        this.log("onChange", model, options);

        // Let backbone tell us which attributes have changed
        const changed = model.changedAttributes();

        // Pass on to plotstate
        this.plotstate.update(changed);

        // Trigger new rendering in pythreejs
        this.trigger('rerender', this, {});
    }

    log() {
        console.log(...arguments);
    }
};


class WireframePlotModel extends PlotModel {
    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : 'WireframePlotModel',
            _view_name : 'WireframePlotView',
            mesh: null,
            //restrict: null,
            wireframe: true,
            edgesize: 0.001,
        });
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);

        // Pythreejs blackbox object will create this.obj in initialize:
        //this.obj = new THREE.Object3D();
    }

    mapAttributes(attributes) {
        const state = {};
        // FIXME: Convert given model attributes to expected unray state formats
        return state;
    }

    createInitialPlotState(root, attributes) {
        this.log("createInitialPlotState", root, attributes);

        // Get relevant attributes
        const { mesh, wireframe, edgesize } = attributes;

        // Map attributes to expected unray input
        const method = "cells";  // FIXME: Hack, surface with wireframe and using restriction
        const data = {};
        const encoding = {};

        console.log("Mesh:", mesh);

        if (mesh) {
            const cells = mesh.get('cells');
            if (cells) {
                // FIXME: Do this with ndarray api
                const id = cells.model_id;
                const array = cells.get('array');

                data[id] = array.data;
                encoding.cells = { field: id };
            }
            const points = mesh.get('points');
            if (points) {
                // FIXME: Do this with ndarray api
                const id = points.model_id;
                const array = points.get('array');

                data[id] = array.data;
                encoding.coordinates = { field: id };
            }
        }

        // FIXME: Fix unray input of various small data like this:
        //encoding.wireframe = wireframe;
        //encoding.wireframe_size = edgesize;

        //const plotname = this.model_id;

        return create_unray_state(root, method, encoding, data);
    }
};
WireframePlotModel.serializers = Object.assign({},
    widgets.WidgetModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models }
    }
);

export {
    WireframePlotModel,
};
