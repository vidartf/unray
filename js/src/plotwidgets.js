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


function getNotNull(model, key) {
    const value = model.get(key);
    if (!value) {
        console.log("Key:", key, "Model:", model);
        throw Error(`Missing required ${key} on ${model}.`);
    }
    return value;
}

function getIdentifiedValue(parent, name) {
    const dataunion = getNotNull(parent, name);
    const value = getArrayFromUnion(dataunion).data;
    const id = dataunion.model_id || parent.model_id + "_" + name;
    return { id, value };
}

function setMeshEncoding(encoding, data, mesh) {
    if (!mesh) {
        throw Error("Mesh is always required.");
    }

    const cells = getIdentifiedValue(mesh, "cells");
    if (cells.value) {
        const { id, value } = cells;
        data[id] = value;
        encoding.cells = { field: id };
    }

    const points = getIdentifiedValue(mesh, "points");
    if (points.value) {
        const { id, value } = points;
        data[id] = value;
        encoding.coordinates = { field: id };
    }
}

function checkMeshEncoding(encoding, data, mesh) {
    if (mesh) {
        const cells = getIdentifiedValue(mesh, "cells");
        if (cells.value) {
            const { id, value } = cells;
            if (encoding.cells.field !== id) {
                console.warn(`Mesh mismatch, cells id differ:`, encoding.cells.field, id);
            }
            if (data[id] !== value) {
                console.warn(`Mesh mismatch, cells value differ:`, data[id], value);
            }
        }
        const points = getIdentifiedValue(mesh, "points");
        if (points.value) {
            const { id, value } = points;
            if (encoding.coordinates.field !== id) {
                console.warn(`Mesh mismatch, points id differ:`, encoding.coordinates.field, id);
            }
            if (data[id] !== value) {
                console.warn(`Mesh mismatch, points value differ:`, data[id], value);
            }
        }
    }
}

function setRestrictEncoding(encoding, data, restrict) {
    if (restrict) {
        // FIXME
        console.error("Missing implementation of restrict encoding.");
    }
}

function setParamsEncoding(encoding, data, params, channel, keys) {
    if (params) {
        const desc = {};
        for (let key of keys) {
            const value = params.get(key);
            if (value !== undefined) {
                desc[key] = value;
            }
        }
        encoding[channel] = desc;
    }
}

function setWireframeEncoding(encoding, data, params) {
    const channel = "wireframe";
    const keys = ["enable", "size", "color", "opacity"];
    setParamsEncoding(encoding, data, params, channel, keys);
}

function setIsovalueParamsEncoding(encoding, data, params) {
    const channel = "isovalues";
    const keys = ["mode", "value", "num_intervals", "spacing", "period"];
    setParamsEncoding(encoding, data, params, channel, keys);
}

function setDensityConstantEncoding(encoding, data, density) {
    // TODO: Allow constant mapped through LUT?
    encoding.density = {
        constant: density.get("value"),
    };
}

function setDensityFieldEncoding(encoding, data, density) {
    encoding.density = {};

    // Top level traits
    const field = getNotNull(density, "field");
    const lut = density.get("lut");

    checkMeshEncoding(encoding, data, field.get("mesh"));

    // Non-optional field values
    const values = getIdentifiedValue(field, "values");
    if (density.value) {
        const { id, value } = values;
        data[id] = value;
        encoding.density.field = id;
        encoding.density.space = field.get("space");
        //encoding.density.range = field.get("range"); // FIXME
    } else {
        throw Error(`Missing values in field.`);
    }

    // Optional LUT
    if (lut) {
        if (lut.isArrayScalarLUT) {
            const values = getIdentifiedValue(lut, "values");
            if (values.value) {
                const { id, value } = values;
                data[id] = value;
                encoding.density.lut_field = id;
                // TODO: Handle linear/log scaled LUTs somehow:
                //encoding.density.lut_space = getNotNull(lut, "space");
            } else {
                throw Error(`Missing values in array LUT.`);
            }
        } else {
            console.error("Invalid scalar LUT", lut);
        }
    }
}

function setDensityEncoding(encoding, data, density) {
    if (density) {
        if (density.isScalarConstant) {
            setDensityConstantEncoding(encoding, data, density);
        } else if (density.isScalarField) {
            setDensityFieldEncoding(encoding, data, density);
        } else {
            console.error("Invalid scalar ", density);
        }
    }
}

function setEmissionConstantEncoding(encoding, data, color) {
    // TODO: Allow constant mapped through LUT?
    encoding.emission = {
        constant: color.get("intensity"),
        color: color.get("color"),
    };
}

function setEmissionFieldEncoding(encoding, data, color) {
    const enc = {};

    // Top level traits
    const field = getNotNull(color, "field");
    const lut = color.get("lut");

    checkMeshEncoding(encoding, data, field.get("mesh"));

    // Non-optional field
    // color: ColorFieldModel
    // field: FieldModel
    // array: DataUnion
    const values = getIdentifiedValue(field, "values");
    if (values.value) {
        const { id, value } = values;
        data[id] = value;
        enc.field = id;
        enc.space = field.get("space");
        // enc.range = field.get("range"); // FIXME
    } else {
        throw Error(`Missing required field values.`);
    }

    // Optional LUT
    if (lut) {
        if (lut.isArrayColorLUT) {
            const values = getIdentifiedValue(lut, "values");
            if (values.value) {
                const { id, value } = values;
                data[id] = value;
                enc.lut_field = id;
                // TODO: Handle linear/log scaled LUTs somehow:
                // enc.lut_space = getNotNull(lut, "space");
            } else {
                throw Error(`Missing required values in ArrayColorLUT`);
            }
        } else if (lut.isNamedColorLUT) {
            const name = getNotNull(lut, "name");
            // FIXME Implement something like this using d3
            const value = getNamedColorLutArray(name);
            const id = name;
            data[id] = value;
            enc.lut_field = id;
            console.error("Named color LUT not implemented.");
        } else {
            console.error("Invalid color LUT", lut);
        }
    }

    // TODO: Cleaner to return enc/data and mutate encoding/data at call site
    // Store encoded channel
    encoding.emission = enc;    
}

function setEmissionEncoding(encoding, data, color) {
    if (color) {
        if (color.isColorConstant) {
            setEmissionConstantEncoding(encoding, data, color);
        } else if (color.isColorField) {
            setEmissionFieldEncoding(encoding, data, color);
        } else {
            console.error("Invalid color ", color);
        }
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
        const encoding = {};
        const data = {};
        setMeshEncoding(encoding, data, this.get("mesh"));
        setRestrictEncoding(encoding, data, this.get("restrict"));
        setEmissionEncoding(encoding, data, this.get("color"));
        setWireframeEncoding(encoding, data, this.get("wireframe"));
        console.log("Encoding in SurfacePlot:")
        console.log("----------------->")
        console.log(encoding)
        console.log("------------------")
        console.log(data)
        console.log("<-----------------")
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
            color: null,  // ColorFieldModel | ColorConstantModel
            field: null,  // Field if different from color.field
            values: null,  // IsovalueParams
            // wireframe: null, // TODO: Add wireframe options
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
        setMeshEncoding(encoding, data, this.get("mesh"));
        setRestrictEncoding(encoding, data, this.get("restrict"));
        setDensityEncoding(encoding, data, this.get("field"));
        setEmissionEncoding(encoding, data, this.get("color"));
        setIsovalueParamsEncoding(encoding, data, this.get("values"));
        //setWireframeEncoding(encoding, data, this.get("wireframe"));
        return { encoding, data };
    }
};
IsosurfacePlotModel.serializers = Object.assign({},
    BlackboxModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models },
        restrict: { deserialize: widgets.unpack_models },
        color: { deserialize: widgets.unpack_models },
        field: { deserialize: widgets.unpack_models },
        values: { deserialize: widgets.unpack_models },
        //wireframe: { deserialize: widgets.unpack_models },
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
            extinction: 1.0,
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
        setMeshEncoding(encoding, data, this.get("mesh"));
        setRestrictEncoding(encoding, data, this.get("restrict"));
        setDensityEncoding(encoding, data, this.get("density"));
        //setConstantEmissionEncoding(encoding, data, this.get("color"));
        encoding.extinction = { value: this.get("extinction") };
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
            color: null,  // ColorFieldModel | ColorConstantModel
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
        setMeshEncoding(encoding, data, this.get("mesh"));
        setRestrictEncoding(encoding, data, this.get("restrict"));
        setEmissionEncoding(encoding, data, this.get("color"));
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
            color: null,  // ColorFieldModel | ColorConstantModel
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
        setMeshEncoding(encoding, data, this.get("mesh"));
        setRestrictEncoding(encoding, data, this.get("restrict"));
        setEmissionEncoding(encoding, data, this.get("color"));
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
            color: null,  // ColorFieldModel | ColorConstantModel
            exposure: 0.0,
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
        setMeshEncoding(encoding, data, this.get("mesh"));
        setRestrictEncoding(encoding, data, this.get("restrict"));
        setEmissionEncoding(encoding, data, this.get("color"));
        encoding.exposure = { value: this.get("exposure") };
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
        setMeshEncoding(encoding, data, this.get("mesh"));
        setRestrictEncoding(encoding, data, this.get("restrict"));
        setDensityEncoding(encoding, data, this.get("density"));
        setEmissionEncoding(encoding, data, this.get("color"));
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
