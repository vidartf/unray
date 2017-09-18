"use strict";

import * as THREE from "three";
import widgets from "@jupyter-widgets/base";
import { BlackboxModel } from "jupyter-threejs";
import { getArrayFromUnion, data_union_serialization } from "jupyter-datawidgets";

//import _ from "underscore";

import { module_defaults } from "./version";
import { create_plot_state } from "./plotstate";


// Copied in from figure.js before deleting that file, maybe useful somewhere
function __recompute_near_far(center, radius, position, fov) {
    const offset = 0.2;
    const dist = position.distanceTo(center);
    const near_edge = dist - radius;
    const far_edge = dist + radius;
    const near = Math.max(0.01 * near_edge, 0.01 * radius);
    const far = 100 * far_edge;
    return [near, far];
}

// Copied in from figure.js before deleting that file, documenting how renderer was previously setup
function __setup_renderer(canvas, width, height, bgcolor) {
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        precision: "highp",
        alpha: true,
        antialias: true,
        stencil: false,
        preserveDrawingBuffer: true,
        depth: true,
        logarithmicDepthBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(bgcolor, 1);

    // Setup scene fog
    //scene.fog = new THREE.Fog(0xaaaaaa);
}



function getIdentifiedValue(model, name) {
    const array = model.get("array");
    const value = getArrayFromUnion(array).data;
    const id = array.model_id || model.model_id + "_" + name;
    return { id, value };
}

function updateMeshEncoding(encoding, data, mesh) {
    const cells = mesh.get("cells");
    if (cells) {
        const { id, value } = getIdentifiedValue(cells, "cells");
        data[id] = value;
        encoding.cells = { field: id };
    }
    const points = mesh.get("points");
    if (points) {
        const { id, value } = getIdentifiedValue(points, "points");
        data[id] = value;
        encoding.coordinates = { field: id };
    }
}


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
        return Object.assign(super.defaults(), module_defaults);
    }

    constructThreeObject() {
        const root = new THREE.Group();
        this.plotState = create_plot_state(root, this.getPlotMethod());
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
class SurfacePlotModel extends PlotModel {
    getPlotMethod() {
        return "surface";
    }

    plotDefaults() {
        return {
            mesh: null,  // MeshModel
            restrict: null,  // IndicatorFieldModel
            color: null,  // ColorFieldModel || ColorConstantModel
            wireframe: null,  // WireframeParamsModel
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : "SurfacePlotModel",
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        console.log("IN buildPlotEncoding");
        const encoding = {};
        const data = {};

        // Always need a mesh
        const mesh = this.get("mesh");
        updateMeshEncoding(encoding, data, mesh);

        // Encode wireframe params
        const wireframe = this.get("wireframe");
        if (wireframe) {
            encoding.wireframe = {};
            for (let key of ["enable", "size", "color", "opacity"]) {
                encoding.wireframe[key] = wireframe.get(key);
            }
        }

        // Encode color / emission
        const color = this.get("color");
        if (color) {
            if (color.is_ColorConstant) {
                encoding.emission = {
                    constant: color.get("intensity"),
                    color: color.get("color"),
                };
            } else if (color.is_ColorField) {
                const desc = {};

                const field = color.get("field");
                const lut = color.get("lut");

                const emission = field.get("values");
                if (emission) {
                    const { id, value } = getIdentifiedValue(emission, "emission");
                    data[id] = value;
                    desc.field = id;
                }
                const emission_lut = lut.get("values");  // FIXME: Assumes ArrayColorLUT
                if (emission_lut) {
                    const { id, value } = getIdentifiedValue(emission_lut, "emission_lut");
                    data[id] = value;
                    desc.lut_field = id;
                }
                encoding.emission = desc;
            }
            console.log("Encoded color:", encoding.emission);
        } else {
            console.log("No color encoding.");
        }

        console.log("LEAVING buildPlotEncoding", encoding, data);
        return { encoding, data };
    }
};
SurfacePlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models },
        restrict: { deserialize: widgets.unpack_models },
        color: { deserialize: widgets.unpack_models },
        wireframe: { deserialize: widgets.unpack_models },
    }
);


export
class IsosurfacePlotModel extends PlotModel {
    getPlotMethod() {
        return "isosurface";
    }

    plotDefaults() {
        return {
            mesh: null,  // MeshModel
            restrict: null,  // IndicatorFieldModel
            color: null,
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : "IsosurfacePlotModel",
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        const encoding = {};
        const data = {};

        // Always need a mesh
        const mesh = this.get("mesh");
        updateMeshEncoding(encoding, data, mesh);

        // TODO

        return { encoding, data };
    }
};
IsosurfacePlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models },
        restrict: { deserialize: widgets.unpack_models },
        color: { deserialize: widgets.unpack_models },
    }
);


export
class XrayPlotModel extends PlotModel {
    getPlotMethod() {
        return "xray";
    }

    plotDefaults() {
        return {
            mesh: null,  // MeshModel
            restrict: null,  // IndicatorFieldModel
            density: null,  // ScalarFieldModel | ScalarConstantModel
            //color: "#ffffff",  // ColorConstant
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : "XrayPlotModel",
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        const encoding = {};
        const data = {};

        // Always need a mesh
        const mesh = this.get("mesh");
        updateMeshEncoding(encoding, data, mesh);

        // Get relevant attributes
        let density = this.get("density");

        // FIXME: Build encoding and data
        if (density) {
        }

        return { encoding, data };
    }
};
XrayPlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models },
        restrict: { deserialize: widgets.unpack_models },
        density: { deserialize: widgets.unpack_models },
        //color: { deserialize: widgets.unpack_models },
    }
);


export
class MinPlotModel extends PlotModel {
    getPlotMethod() {
        return "min";
    }

    plotDefaults() {
        return {
            mesh: null,  // MeshModel
            restrict: null,  // IndicatorFieldModel
            color: null,  // ColorFieldModel
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : "MinPlotModel",
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        const encoding = {};
        const data = {};

        // Always need a mesh
        const mesh = this.get("mesh");
        updateMeshEncoding(encoding, data, mesh);

        // TODO

        return { encoding, data };
    }
};
MinPlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models },
        restrict: { deserialize: widgets.unpack_models },
        color: { deserialize: widgets.unpack_models },
    }
);


export
class MaxPlotModel extends PlotModel {
    getPlotMethod() {
        return "max";
    }

    plotDefaults() {
        return {
            mesh: null,  // MeshModel
            restrict: null,  // IndicatorFieldModel
            color: null,  // ColorFieldModel
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : "MaxPlotModel",
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        const encoding = {};
        const data = {};

        // Always need a mesh
        const mesh = this.get("mesh");
        updateMeshEncoding(encoding, data, mesh);

        // TODO

        return { encoding, data };
    }
};
MaxPlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models },
        restrict: { deserialize: widgets.unpack_models },
        color: { deserialize: widgets.unpack_models },
    }
);


export
class SumPlotModel extends PlotModel {
    getPlotMethod() {
        return "sum";
    }

    plotDefaults() {
        return {
            mesh: null,  // MeshModel
            restrict: null,  // IndicatorFieldModel
            color: null,  // ColorFieldModel
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : "SumPlotModel",
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        const encoding = {};
        const data = {};

        // Always need a mesh
        const mesh = this.get("mesh");
        updateMeshEncoding(encoding, data, mesh);

        // TODO

        return { encoding, data };
    }
};
SumPlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models },
        restrict: { deserialize: widgets.unpack_models },
        color: { deserialize: widgets.unpack_models },
    }
);


export
class VolumePlotModel extends PlotModel {
    getPlotMethod() {
        return "volume";
    }

    plotDefaults() {
        return {
            mesh: null,  // MeshModel
            restrict: null,  // IndicatorFieldModel
            density: null,  // ScalarFieldModel | ScalarConstantModel
            color: null,  // ColorFieldModel | ColorConstantModel
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : "VolumePlotModel",
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        const encoding = {};
        const data = {};

        // Always need a mesh
        const mesh = this.get("mesh");
        updateMeshEncoding(encoding, data, mesh);

        // TODO

        return { encoding, data };
    }
};
VolumePlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models },
        restrict: { deserialize: widgets.unpack_models },
        density: { deserialize: widgets.unpack_models },
        color: { deserialize: widgets.unpack_models },
    }
);
