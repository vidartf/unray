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
    // Override this in every subclass
    getPlotMethod() {
        throw Error("Missing implementation of getPlotMethod.");
    }

    // Override this in every subclass
    buildPlotEncoding() {
        throw Error("Missing implementation of buildPlotEncoding.");
    }

    defaults() {
        return Object.assign(super.defaults(), version.module_defaults);
    }

    constructThreeObject() {
        const root = new THREE.Group();
        this.plotState = create_unray_state(root, this.getPlotMethod());
        const { encoding, data } = this.buildPlotEncoding();
        this.plotState.init(encoding, data);
        return root;
    }

    updatePlotState(changed) {
        // TODO: Only update the affected parts?
        // Doing so is a bit complex and may not
        // be that important to performance, considering
        // the large objects are reused through reference
        // counting managers internally.
        const { encoding, data } = this.buildPlotEncoding();
        this.plotState.update(encoding, data);
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
    getPlotMethod() {
        return "mesh";
    }

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

    buildPlotEncoding() {
        // Map attributes to expected unray input
        const encoding = {};
        const data = {};

        // If we need a plot id for this object, this should do the trick
        //const plotname = this.model_id;

        // Get relevant attributes
        const mesh = this.get('mesh');

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

        return { encoding, data };
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
    getPlotMethod() {
        return "surface";
    }

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

    buildPlotEncoding() {
        // Map attributes to expected unray input
        const encoding = {};
        const data = {};

        // If we need a plot id for this object, this should do the trick
        const plotname = this.model_id;

        // FIXME: This currently assumes 'color' is a ColorField
        // Get relevant attributes
        let color = this.get('color');

        if (color) {
            const field = color.get('field');
            const mesh = field.get('mesh');

            // TODO: Reuse mesh encoding, maybe even reuse encoding for each channel
            const cells = mesh.get('cells');
            if (cells) {
                const array = cells.get('array');
                const id = plotname + "_cells";  // FIXME: Get model_id from array if available
                data[id] = getArrayFromUnion(array).data;
                encoding.cells = { field: id };
            }
            const points = mesh.get('points');
            if (points) {
                const array = points.get('array');
                const id = plotname + "_points";  // FIXME: Get model_id from array if available
                data[id] = getArrayFromUnion(array).data;
                encoding.coordinates = { field: id };
            }

            const emission = field.get('values');
            if (emission) {
                const array = emission;
                const id = plotname + "_emission";  // FIXME: Get model_id from array if available
                data[id] = getArrayFromUnion(array).data;
                encoding.emission = { field: id };
            }
            const emission_lut = color.get('lut');
            if (emission_lut) {
                // FIXME: Assumes ArrayColorLUT
                const array = emission_lut.get('values');
                const id = plotname + "_emission_lut";  // FIXME: Get model_id from array if available
                data[id] = getArrayFromUnion(array).data;
                encoding.emission_lut = { field: id };
            }
        }

        // FIXME: Fix unray input of various small data like this:
        //encoding.wireframe = wireframe;
        //encoding.wireframe_size = edgesize;

        return { encoding, data };        
    }
};
SurfacePlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        color: { deserialize: widgets.unpack_models },
    }
);


export
class IsosurfacePlotModel extends PlotModel {
    getPlotMethod() {
        return "isosurface";
    }

    plotDefaults() {
        return {
            // TODO
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : 'IsosurfacePlotModel',
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        // Map attributes to expected unray input
        const encoding = {};
        const data = {};

        // If we need a plot id for this object, this should do the trick
        //const plotname = this.model_id;

        // TODO

        return { encoding, data };
    }
};
IsosurfacePlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
            // TODO
    }
);


export
class XrayPlotModel extends PlotModel {
    getPlotMethod() {
        return "xray";
    }

    plotDefaults() {
        return {
            density: null,  // FieldModel
            //restrict: null,
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : 'XrayPlotModel',
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        // Map attributes to expected unray input
        const encoding = {};
        const data = {};

        // If we need a plot id for this object, this should do the trick
        //const plotname = this.model_id;

        // Get relevant attributes
        let density = this.get('density');


        // FIXME: Build encoding and data
        if (density) {
        }

        return { encoding, data };
    }
};
XrayPlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        density: { deserialize: widgets.unpack_models },
    }
);


export
class MinPlotModel extends PlotModel {
    getPlotMethod() {
        return "min";
    }

    plotDefaults() {
        return {
            // TODO
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : 'MinPlotModel',
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        // Map attributes to expected unray input
        const encoding = {};
        const data = {};

        // If we need a plot id for this object, this should do the trick
        //const plotname = this.model_id;

        // TODO

        return { encoding, data };
    }
};
MinPlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        // TODO
    }
);


export
class MaxPlotModel extends PlotModel {
    getPlotMethod() {
        return "max";
    }

    plotDefaults() {
        return {
            // TODO
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : 'MaxPlotModel',
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        // Map attributes to expected unray input
        const encoding = {};
        const data = {};

        // If we need a plot id for this object, this should do the trick
        //const plotname = this.model_id;

        // TODO

        return { encoding, data };
    }
};
MaxPlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        // TODO
    }
);


export
class SumPlotModel extends PlotModel {
    getPlotMethod() {
        return "sum";
    }

    plotDefaults() {
        return {
            // TODO
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : 'SumPlotModel',
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        // Map attributes to expected unray input
        const encoding = {};
        const data = {};

        // If we need a plot id for this object, this should do the trick
        //const plotname = this.model_id;

        // TODO

        return { encoding, data };
    }
};
SumPlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        // TODO
    }
);


export
class VolumePlotModel extends PlotModel {
    getPlotMethod() {
        return "volume";
    }

    plotDefaults() {
        return {
            // TODO
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : 'VolumePlotModel',
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        // Map attributes to expected unray input
        const encoding = {};
        const data = {};

        // If we need a plot id for this object, this should do the trick
        //const plotname = this.model_id;

        // TODO

        return { encoding, data };
    }
};
VolumePlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        // TODO
    }
);
