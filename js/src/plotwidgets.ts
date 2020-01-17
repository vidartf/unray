"use strict";

import * as THREE from "three";
import * as widgets from "@jupyter-widgets/base";
import { getArray } from "jupyter-dataserializers";

//import _ from "underscore";

import { module_defaults } from "./version";

import { create_plot_state, IPlotState } from "./plotstate";

import * as datamodels from './datawidgets';

import {
    ISerializers, TypedArray, Method, IPlotData
} from './utils';

import * as encodings from './encodings';


export
declare class ThreeModel extends widgets.WidgetModel {
    createPropertiesArrays(): void;
    setupListeners(): void;
    processNewObj(obj: any): any;
    createThreeObjectAsync(): Promise<any>;
    constructThreeObject(): any | Promise<any>;
    onCustomMessage(content: any, buffers: any): void;
    syncToThreeObj(): void;
    syncToModel(): void;

    obj: any;
    three_properties: string[];
    three_nested_properties: string[];
    datawidget_properties: string[];
    initPromise: Promise<any>;
}


export
const BlackboxModel = require("jupyter-threejs/src").BlackboxModel as (typeof ThreeModel);


function getNamedColorMapArray(name: string) {
    // FIXME Implement something like this using d3
}


function getNotNull<T>(model: widgets.WidgetModel, key: string): T {
    const value = model.get(key);
    if (!value) {
        console.error("Key:", key, "Model:", model);
        throw new Error(`Missing required ${key} on ${model}.`);
    }
    return value;
}

function getIdentifiedValue(parent: widgets.WidgetModel, name: string) {
    const dataunion = getNotNull<widgets.WidgetModel>(parent, name);
    const array = getArray(dataunion);
    if (array === null) {
        throw new Error(`Array "${name}" is null!`);
    }
    const id: string = dataunion.model_id || parent.model_id + "_" + name;
    return { id, value: array.data };
}


interface IPartialEncodingEntriesAndData {
    encoding: {[key: string]: encodings.IPartialEncodingEntry | undefined};
    data?: IPlotData;
}

export
interface IPartialEncodingAndData {
    encoding: encodings.IPartialEncoding;
    data?: IPlotData;
}

export
interface IEncodingAndData {
    encoding: encodings.IEncoding;
    data?: IPlotData;
}

function createMeshEncoding(mesh: datamodels.MeshModel): IPartialEncodingAndData {
    if (!mesh) {
        throw new Error("Mesh is always required.");
    }
    const data: IPlotData = {};

    const cells = getIdentifiedValue(mesh, "cells");
    data[cells.id] = cells.value;

    const points = getIdentifiedValue(mesh, "points");
    data[points.id] = points.value;

    const encoding: encodings.IMeshEncoding = {
        cells: { field: cells.id },
        coordinates: { field: points.id },
    };

    return { encoding: encoding, data };
}

function checkMeshEncoding(encoding: encodings.IMeshEncoding, data: IPlotData, mesh: datamodels.MeshModel) {
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

function createParamsEncoding(params: widgets.WidgetModel, channel: string, keys: string[]): IPartialEncodingEntriesAndData {
    const encoding: {[key: string]: encodings.IPartialEncodingEntry | undefined} = {};
    const data: IPlotData = {};
    if (params) {
        const desc: any = {};
        for (let key of keys) {
            const value = params.get(key);
            if (value !== undefined) {
                desc[key] = value;
            }
        }
        encoding[channel] = desc;
    }
    return { encoding, data };
}

function createWireframeParamsEncoding(params: datamodels.WireframeParamsModel): IPartialEncodingEntriesAndData {
    const channel = "wireframe";
    const keys = ["enable", "size", "color", "opacity"];
    return createParamsEncoding(params, channel, keys);
}

function createIsovalueParamsEncoding(params: datamodels.IsovalueParamsModel): IPartialEncodingEntriesAndData {
    const channel = "isovalues";
    const keys = ["mode", "value", "num_intervals", "base", "exponent"];
    return createParamsEncoding(params, channel, keys);
}

function createRestrictEncoding(restrict: datamodels.ScalarIndicatorsModel): IPartialEncodingEntriesAndData {
    const encoding: {indicators?: encodings.IIndicatorsEncodingEntry} = {};
    const data: IPlotData = {};
    if (restrict) {
        const desc: Partial<encodings.IIndicatorsEncodingEntry> = {};

        // Top level traits
        const field = getNotNull<datamodels.FieldModel>(restrict, "field");
        const lut = restrict.get("lut");

        // Non-optional field values
        const values = getIdentifiedValue(field, "values");
        if (values.value) {
            const { id, value } = values;
            data[id] = value;
            desc.field = id;
            desc.value = restrict.get("value");
            desc.space = field.get("space");
        } else {
            throw new Error(`Missing values in field.`);
        }

        // Optional LUT
        // if (lut) {
        //     if (lut.isArrayScalarLUT) {
        //         const values = getIdentifiedValue(lut, "values");
        //         if (values.value) {
        //             const { id, value } = values;
        //             data[id] = value;
        //             desc.lut_field = id;
        //             // TODO: Handle linear/log scaled LUTs somehow:
        //             //desc.lut_space = getNotNull(lut, "space");
        //         } else {
        //             throw new Error(`Missing values in array LUT.`);
        //         }
        //     } else {
        //         throw new Error(`"Invalid scalar LUT ${lut}`);
        //     }
        // }

        encoding.indicators = desc as encodings.IIndicatorsEncodingEntry;
    }
    return { encoding, data };
}

function createDensityConstantEncoding(density: datamodels.ScalarConstantModel): IPartialEncodingEntriesAndData {
    // TODO: Allow constant mapped through LUT?
    const encoding = {
        density: {
            constant: density.get("value"),
        },
    };
    const data = {};
    return { encoding, data };
}

function createDensityFieldEncoding(density: datamodels.ScalarFieldModel): IPartialEncodingEntriesAndData {
    const desc: Partial<encodings.IDensityEncodingEntry> = {};
    const data: IPlotData = {};

    // Top level traits
    const field = getNotNull<datamodels.FieldModel>(density, "field");
    const lut = density.get("lut");
    const scale = density.get("scale");

    // Non-optional field values
    const values = getIdentifiedValue(field, "values");
    if (values.value) {
        const { id, value } = values;
        data[id] = value;
        desc.field = id;
        desc.space = field.get("space");
    } else {
        throw new Error(`Missing values in field.`);
    }

    if (scale) {
        desc.scale = scale.get("mode");
        desc.domain = scale.get("domain");
        desc.scale_base = scale.get("base");
        desc.scale_exponent = scale.get("exponent");
    }

    // Optional LUT
    if (lut) {
        if (lut.isArrayScalarMap) {
            const values = getIdentifiedValue(lut, "values");
            if (values.value) {
                const { id, value } = values;
                data[id] = value;
                desc.lut_field = id;
                // TODO: Handle linear/log scaled Maps somehow:
                //desc.lut_space = getNotNull(lut, "space");
            } else {
                throw new Error(`Missing values in array LUT.`);
            }
        } else {
            throw new Error(`"Invalid scalar LUT ${lut}`);
        }
    }

    const encoding = { density: desc };
    return { encoding, data };
}

function createDensityEncoding(density: datamodels.ScalarFieldModel | datamodels.ScalarConstantModel): IPartialEncodingEntriesAndData {
    if (density) {
        if (datamodels.isScalarConstant(density)) {
            return createDensityConstantEncoding(density);
        } else if (datamodels.isScalarField(density)) {
            return createDensityFieldEncoding(density);
        } else {
            throw new Error(`Invalid scalar ${density}.`);
        }
    }
    return { encoding: {}, data: {} };
}

function createEmissionConstantEncoding(color: datamodels.ColorConstantModel): IPartialEncodingEntriesAndData {
    // TODO: Allow constant mapped through LUT?
    const data = {};
    const encoding = {
        emission: {
            constant: color.get("intensity") as number,
            color: color.get("color") as string,
        }
    };
    return { encoding, data };
}

function createEmissionFieldEncoding(color: datamodels.ColorFieldModel): IPartialEncodingEntriesAndData {
    const desc: Partial<encodings.IEmissionEncodingEntry> = {};
    const data: IPlotData = {};

    // Top level traits
    const field = getNotNull<datamodels.FieldModel>(color, "field");
    const lut = color.get("lut");
    const scale = color.get("scale");

    // Non-optional field
    // color: ColorFieldModel
    // field: FieldModel
    // array: DataUnion
    const values = getIdentifiedValue(field, "values");
    if (values.value) {
        const { id, value } = values;
        data[id] = value;
        desc.field = id;
        desc.space = field.get("space");
    } else {
        throw new Error(`Missing required field values.`);
    }

    if (scale) {
        desc.scale = scale.get("mode");
        desc.domain = scale.get("domain");
        desc.scale_base = scale.get("base");
        desc.scale_exponent = scale.get("exponent");
    }

    // Optional LUT
    if (lut) {
        if (lut.isArrayColorMap) {
            const values = getIdentifiedValue(lut, "values");
            if (values.value) {
                const { id, value } = values;
                data[id] = value;
                desc.lut_field = id;
                // TODO: Handle linear/log scaled LUTs somehow:
                // desc.lut_space = getNotNull(lut, "space");
            } else {
                throw new Error(`Missing required values in ArrayColorMap`);
            }
        } else if (lut.isNamedColorMap) {
            const name = getNotNull<string>(lut, "name");
            const value = getNamedColorMapArray(name);
            const id = name;
            data[id] = value;
            desc.lut_field = id;
            console.error("Named colormap not implemented.");
        } else {
            console.error("Invalid colormap", lut);
        }
    }

    const encoding = { emission: desc };
    return { encoding, data };
}

function createEmissionEncoding(color: datamodels.ColorConstantModel | datamodels.ColorFieldModel): IPartialEncodingEntriesAndData {
    if (color) {
        if (datamodels.isColorConstant(color)) {
            return createEmissionConstantEncoding(color);
        } else if (datamodels.isColorField(color)) {
            return createEmissionFieldEncoding(color);
        } else {
            throw new Error(`Invalid color ${color}`);
        }
    }
    return { encoding: {}, data: {} };
}

function createExtinctionEncoding(extinction: number): IPartialEncodingEntriesAndData {
    const encoding = { extinction: { value: extinction } };
    return { encoding };
}

function createExposureEncoding(exposure: number): IPartialEncodingEntriesAndData {
    const encoding = { exposure: { value: exposure } };
    return { encoding };
}


// Merge a list of { encoding, data } objects into one
function mergeEncodings(...encodings: IPartialEncodingEntriesAndData[]): IPartialEncodingAndData {
    const dst = { encoding: {}, data: {} } as IPartialEncodingAndData;
    for (let src of encodings) {
        Object.assign(dst.encoding, src.encoding);
        Object.assign(dst.data, src.data);
    }
    return dst;
}


export
abstract class PlotModel extends BlackboxModel {
    // Override this in every subclass
    abstract getPlotMethod(): Method;

    // Override this in every subclass
    abstract buildPlotEncoding(): IPartialEncodingAndData;

    defaults() {
        return Object.assign(super.defaults(), module_defaults, {
            mesh: null,  // MeshModel
            restrict: null,  // ScalarIndicatorsModel
        });
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_data_models = ['mesh', 'restrict'];
    }

    setupListeners() {
        super.setupListeners();
        // Handle changes in child model instance props
        for (let propName of this.child_data_models) {
            // register listener for current child value
            var curValue = this.get(propName) as widgets.WidgetModel;
            if (curValue) {
                this.listenTo(curValue, 'change', this.onDataChildChanged.bind(this));
                this.listenTo(curValue, 'childchange', this.onDataChildChanged.bind(this));
            }

            // make sure to (un)hook listeners when child points to new object
            this.on('change:' + propName, (model: widgets.WidgetModel, value: widgets.WidgetModel, options: any) => {
                const prevModel = this.previous(propName) as widgets.WidgetModel;
                const currModel = value;
                if (prevModel) {
                    this.stopListening(prevModel);
                }
                if (currModel) {
                    this.listenTo(currModel, 'change', this.onDataChildChanged.bind(this));
                    this.listenTo(currModel, 'childchange', this.onDataChildChanged.bind(this));
                }
            }, this);
        };
    }

    onDataChildChanged(model: widgets.WidgetModel, options: any) {
        // One of the child data widgets has changed, ensure THREE
        // object gets updated:
        this.syncToThreeObj();
        // Then ensure we let pythreejs know our object is changed:
        this.trigger('childchange', this);
    }

    constructThreeObject(): THREE.Group {
        const root = new THREE.Group();
        this.plotState = create_plot_state(root, this.getPlotMethod());
        const { encoding, data } = this.buildPlotEncoding();
        this.plotState.init(encoding, data);
        return root;
    }

    updatePlotState(changed: any) {
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

    plotState: IPlotState;

    child_data_models: string[];

    static serializers: ISerializers = Object.assign({},
        BlackboxModel.serializers,
        {
            mesh: { deserialize: widgets.unpack_models },
            restrict: { deserialize: widgets.unpack_models },
        }
    );
};


export
class SurfacePlotModel extends PlotModel {
    getPlotMethod(): Method {
        return "surface";
    }

    plotDefaults() {
        return {
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
        return mergeEncodings(
            createMeshEncoding(this.get("mesh")),
            createRestrictEncoding(this.get("restrict")),
            createEmissionEncoding(this.get("color")),
            createWireframeParamsEncoding(this.get("wireframe"))
        );
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_data_models.push('color', 'wireframe');
    }

    static serializers: ISerializers = Object.assign({},
        PlotModel.serializers,
        {
            color: { deserialize: widgets.unpack_models },
            wireframe: { deserialize: widgets.unpack_models },
        }
    );
}


export
class IsosurfacePlotModel extends PlotModel {
    getPlotMethod(): Method {
        return "isosurface";
    }

    plotDefaults() {
        return {
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
        return mergeEncodings(
            createMeshEncoding(this.get("mesh")),
            createRestrictEncoding(this.get("restrict")),
            createDensityEncoding(this.get("field")),
            createEmissionEncoding(this.get("color")),
            createIsovalueParamsEncoding(this.get("values"))
            //createWireframeParamsEncoding(this.get("wireframe"))
        );
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_data_models.push('color', 'field', 'values');
    }

    static serializers: ISerializers = Object.assign({},
        PlotModel.serializers,
        {
            color: { deserialize: widgets.unpack_models },
            field: { deserialize: widgets.unpack_models },
            values: { deserialize: widgets.unpack_models },
            //wireframe: { deserialize: widgets.unpack_models },
        }
    );
}


export
class XrayPlotModel extends PlotModel {
    getPlotMethod(): Method {
        return "xray";
    }

    plotDefaults() {
        return {
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
        return mergeEncodings(
            createMeshEncoding(this.get("mesh")),
            createRestrictEncoding(this.get("restrict")),
            createDensityEncoding(this.get("density")),
            //createEmissionConstantEncoding(this.get("color")),
            createExtinctionEncoding(this.get("extinction"))
        );
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_data_models.push('density', 'extinction');
    }

    static serializers: ISerializers = Object.assign({},
        PlotModel.serializers,
        {
            density: { deserialize: widgets.unpack_models },
            //color: { deserialize: widgets.unpack_models },
        }
    );
}

export
class MinPlotModel extends PlotModel {
    getPlotMethod(): Method {
        return "min";
    }

    plotDefaults() {
        return {
            color: null,  // ColorFieldModel | ColorConstantModel
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : "MinPlotModel",
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        return mergeEncodings(
            createMeshEncoding(this.get("mesh")),
            createRestrictEncoding(this.get("restrict")),
            createEmissionEncoding(this.get("color"))
        );
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_data_models.push('color');
    }

    static serializers: ISerializers = Object.assign({},
        PlotModel.serializers,
        {
            color: { deserialize: widgets.unpack_models },
        }
    );
}


export
class MaxPlotModel extends PlotModel {
    getPlotMethod(): Method {
        return "max";
    }

    plotDefaults() {
        return {
            color: null,  // ColorFieldModel | ColorConstantModel
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : "MaxPlotModel",
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        return mergeEncodings(
            createMeshEncoding(this.get("mesh")),
            createRestrictEncoding(this.get("restrict")),
            createEmissionEncoding(this.get("color"))
        );
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_data_models.push('color');
    }

    static serializers: ISerializers = Object.assign({},
        PlotModel.serializers,
        {
            color: { deserialize: widgets.unpack_models },
        }
    );
}


export
class SumPlotModel extends PlotModel {
    getPlotMethod(): Method {
        return "sum";
    }

    plotDefaults() {
        return {
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
        return mergeEncodings(
            createMeshEncoding(this.get("mesh")),
            createRestrictEncoding(this.get("restrict")),
            createEmissionEncoding(this.get("color")),
            createExposureEncoding(this.get("exposure"))
        );
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_data_models.push('color');
    }

    static serializers: ISerializers = Object.assign({},
        PlotModel.serializers,
        {
            color: { deserialize: widgets.unpack_models },
        }
    );
}


export
class VolumePlotModel extends PlotModel {
    getPlotMethod(): Method {
        return "volume";
    }

    plotDefaults() {
        return {
            density: null,  // ScalarFieldModel | ScalarConstantModel
            color: null,  // ColorFieldModel | ColorConstantModel
            extinction: 1.0,
            exposure: 0.0,
        };
    }

    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : "VolumePlotModel",
            }, this.plotDefaults());
    }

    buildPlotEncoding() {
        return mergeEncodings(
            createMeshEncoding(this.get("mesh")),
            createRestrictEncoding(this.get("restrict")),
            createDensityEncoding(this.get("density")),
            createEmissionEncoding(this.get("color")),
            createExtinctionEncoding(this.get("extinction")),
            createExposureEncoding(this.get("exposure"))
        );
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_data_models.push('color', 'density', 'extinction', 'exposure');
    }

    static serializers: ISerializers = Object.assign({},
        PlotModel.serializers,
        {
            density: { deserialize: widgets.unpack_models },
            color: { deserialize: widgets.unpack_models },
        }
    );
}
