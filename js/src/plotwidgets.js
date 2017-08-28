'use strict';

// TODO: Add classes mirroring plotwidgets.py here

// TODO: Remove data.js, figure.js, plot.js once replacements are up


import widgets from '@jupyter-widgets/base';

//import _ from 'underscore';

import version from './version';

import {create_unray_state} from './renderer';

import {
    getArrayFromUnion, data_union_serialization
} from 'jupyter-datawidgets';

import {BlackboxModel} from 'jupyter-threejs';

import * as THREE from 'three';


class PlotModel extends BlackboxModel {
    defaults() {
        return Object.assign(super.defaults(), version.module_defaults);
    }

    constructThreeObject() {
        const root = new THREE.Group();
        this.plotState = this.createInitialPlotState(root);
        return root;
    }

    syncToThreeObj() {
        super.syncToThreeObj();

        // Let backbone tell us which attributes have changed
        const changed = this.changedAttributes();

        // Let plotState update itself (mutates this.plotState)
        this.updatePlotState(changed);
    }

    log() {
        console.log(...arguments);
    }
};


export
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
            }, this.plotDefaults());
    }

    // mapAttributes(attributes) {
    //     const state = {};
    //     // FIXME: Convert given model attributes to expected unray state formats
    //     return state;
    // }

    createInitialPlotState(root) {
        this.log("createInitialPlotState", root);

        // Get relevant attributes
        const mesh = this.get('mesh');

        // Map attributes to expected unray input
        const method = "mesh";  // FIXME: Hack, surface with wireframe and using restriction
        const data = {};
        const encoding = {};

        if (mesh) {
            const cells = mesh.get('cells');
            if (cells) {
                // FIXME: Get id and array with ipydatawidgets api
                const array = cells.get('array');

                data['cells'] = getArrayFromUnion(array).data;
                encoding.cells = { field: 'cells' };
            }
            const points = mesh.get('points');
            if (points) {
                // FIXME: Get id and array with ipydatawidgets api
                const array = points.get('array');

                data['points'] = getArrayFromUnion(array).data;
                encoding.coordinates = { field: 'points' };
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
    BlackboxModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models }
    }
);


export
class SurfacePlotModel extends PlotModel {
    plotDefaults() {
        return {
            //restrict: null,
            color: null,
            wireframe: true,
            edgesize: 0.001,
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : 'SurfacePlotModel',
            }, this.plotDefaults());
    }

    // mapAttributes(attributes) {
    //     const state = {};
    //     // FIXME: Convert given model attributes to expected unray state formats
    //     return state;
    // }

    createInitialPlotState(root) {
        this.log("createInitialPlotState", root);

        // FIXME: This currently assumes 'color' is a ColorField
        // Get relevant attributes
        let color = this.get('color');

        // Map attributes to expected unray input
        const method = "surface";
        const data = {};
        const encoding = {};

        if (color) {
            const field = color.get('field');
            const mesh = field.get('mesh');
            const cells = mesh.get('cells');
            if (cells) {
                // FIXME: Get id and array with ipydatawidgets api
                const array = cells.get('array');

                data['cells'] = getArrayFromUnion(array).data;
                encoding.cells = { field: 'cells' };
            }
            const points = mesh.get('points');
            if (points) {
                // FIXME: Get id and array with ipydatawidgets api
                const array = points.get('array');

                data['points'] = getArrayFromUnion(array).data;
                encoding.coordinates = { field: 'points' };
            }
            const emission = field.get('values');
            if (emission) {
                data['emission'] = getArrayFromUnion(emission).data;
                encoding.emission = { field: 'emission' };
            }
            const emission_lut = color.get('lut');
            if (emission_lut) {
                // FIXME: Assumes ArrayColorLUT
                const array = emission_lut.get('values');
                data['emission_lut'] = getArrayFromUnion(array).data;
                encoding.emission_lut = { field: 'emission_lut' };
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
SurfacePlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        color: { deserialize: widgets.unpack_models },
    }
);
