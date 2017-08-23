'use strict';

// TODO: Add classes mirroring plotwidgets.py here

// TODO: Remove data.js, figure.js, plot.js once replacements are up


import widgets from '@jupyter-widgets/base';

//import _ from 'underscore';

import version from './version';

import {create_unray_state} from './renderer';

import {BlackboxModel} from 'jupyter-threejs';
//import * as Three from 'jupyter-threejs';


class PlotModel extends BlackboxModel {
    defaults() {
        return Object.assign(super.defaults(), version.module_defaults);
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);

        // Avoid race condition with base class initialize
        this.plotPromise = this.initPromise.then(() => {
            // this.obj is the root created by pythreejs blackbox
            const root = this.obj;
            if (root === undefined) {
                console.error("Expected this.obj to be available.");
            }

            // Initialize subclass plot state
            this.plotState = this.createInitialPlotState(root, attributes);
        });
    
        // Get any change events
        this.on('change', this.onPlotChange, this);
    }

    // onChange is taken by base class
    onPlotChange(model, options) {
        // TODO: I don't know if this is right
        if (options === 'pushFromThree') {
            return;
        }

        // Let backbone tell us which attributes have changed
        const changed = model.changedAttributes();

        // Avoid race condition with initialize
        this.plotPromise = this.plotPromise.then(() => {
            // Let plotState update itself (mutates this.plotState)
            this.updatePlotState(changed);

            // Trigger new rendering in pythreejs
            this.trigger('rerender', this, {});
        });
    }

    log() {
        console.log(...arguments);
    }
};


class WireframePlotModel extends PlotModel {
    plotDefaults() {
        return {
            mesh: null,
            //restrict: null,
            wireframe: true,
            edgesize: 0.001,
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : 'WireframePlotModel',
            _view_name : 'WireframePlotView',
            }, this.plotDefaults());
    }

    // mapAttributes(attributes) {
    //     const state = {};
    //     // FIXME: Convert given model attributes to expected unray state formats
    //     return state;
    // }

    createInitialPlotState(root, attributes) {
        this.log("createInitialPlotState", root, attributes);

        // Get relevant attributes
        const { mesh, wireframe, edgesize } = attributes;

        // Map attributes to expected unray input
        const method = "mesh";  // FIXME: Hack, surface with wireframe and using restriction
        const data = {};
        const encoding = {};

        if (mesh) {
            const cells = mesh.get('cells');
            if (cells) {
                // FIXME: Get id and array with ipydatawidgets api
                const id = cells.model_id;
                const array = cells.get('array');

                data[id] = array.data;
                encoding.cells = { field: id };
            }
            const points = mesh.get('points');
            if (points) {
                // FIXME: Get id and array with ipydatawidgets api
                const id = points.model_id;
                const array = points.get('array');

                data[id] = array.data;
                encoding.coordinates = { field: id };
            }
        }

        // FIXME: Fix unray input of various small data like this:
        //encoding.wireframe = wireframe;
        //encoding.wireframe_size = edgesize;

        // If we need a plot id for this object, this should do the trick
        //const plotname = this.model_id;

        const plotState = create_unray_state(root, method, encoding, data);
        return plotState;
    }

    updatePlotState(changed) {
        // FIXME: Convert changed to unray data/encoding and
        //        actually implement this update function:
        this.plotState.update(changed);
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
