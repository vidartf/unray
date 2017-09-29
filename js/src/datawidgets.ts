"use strict";

//import _ from "underscore";

import { module_defaults } from "./version";
import * as widgets from "@jupyter-widgets/base";
import {
    data_union_serialization, listenToUnion
} from "jupyter-dataserializers";

import {
    ISerializers
} from './utils';


export
class BaseModel extends widgets.WidgetModel {

    initialize(attributes: any, options: {model_id: string, comm?: any, widget_manager: widgets.ManagerBase<any>}) {
        super.initialize(attributes, options);
        this.createPropertiesArrays();
        this.setupListeners();
    }

    createPropertiesArrays() {
        this.datawidget_properties = [];
        this.child_model_properties = [];
    }

    setupListeners() {
        // Handle changes in child model instance props
        for (let propName of this.child_model_properties) {
            // register listener for current child value
            var curValue = this.get(propName) as BaseModel;
            if (curValue) {
                this.listenTo(curValue, 'change', this.onChildChanged.bind(this));
                this.listenTo(curValue, 'childchange', this.onChildChanged.bind(this));
            }

            // make sure to (un)hook listeners when child points to new object
            this.on('change:' + propName, (model: BaseModel, value: BaseModel, options: any) => {
                const prevModel = this.previous(propName) as BaseModel;
                const currModel = value;
                if (prevModel) {
                    this.stopListening(prevModel);
                }
                if (currModel) {
                    this.listenTo(currModel, 'change', this.onChildChanged.bind(this));
                    this.listenTo(currModel, 'childchange', this.onChildChanged.bind(this));
                }
            }, this);
        };

        // Handle changes in data widgets/union properties
        for (let propName of this.datawidget_properties) {
            listenToUnion(this, propName, this.onChildChanged.bind(this), false);
        };
        this.on('change', this.onChange, this);
    }

    onChildChanged(model: widgets.WidgetModel, options: any) {
        console.log('child changed: ' + model.model_id);
        // Propagate up hierarchy:
        this.trigger('childchange', this);
    }

    onChange(model: widgets.WidgetModel, options: any) {
        // Let backbone tell us which attributes have changed
        const changed = this.changedAttributes();

        console.log("Mesh::onChange", model, options, changed);

        // TODO: Reorient cells on change event
    }

    datawidget_properties: string[];
    child_model_properties: string[];
}


export
class MeshModel extends BaseModel {
    get isMesh() { return true; }

    defaults() {
        return Object.assign(super.defaults(), module_defaults, {
            _model_name : "MeshModel",
            auto_orient: true,
            cells: null,  // ndarray
            points: null,  // ndarray
        });
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        // This will ensure changes to the data in these trigger a change event
        // regardless of whether they are arrays or datawidgets:
        // The change events will trigger a rerender when object is added to scene
        this.datawidget_properties.push("cells", "points");
    }

    static serializers: ISerializers = Object.assign({},
        BaseModel.serializers,
        {
            cells: data_union_serialization,
            points: data_union_serialization,
        }
    );
}


export
class FieldModel extends BaseModel {
    get isField() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "FieldModel",
            mesh: null,  // MeshModel
            values: null,  // ndarray
            space: "P1",
        });
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.datawidget_properties.push("values");
        this.child_model_properties.push("mesh");
    }

    static serializers: ISerializers = Object.assign({},
        BaseModel.serializers,
        {
            mesh: { deserialize: widgets.unpack_models },
            values: data_union_serialization,
        }
    );
}


export
class IndicatorFieldModel extends BaseModel {
    get isIndicatorField() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "IndicatorFieldModel",
            mesh: null,  // MeshModel
            values: null,  // ndarray
            space: "I3",
        });
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.datawidget_properties.push("values");
        this.child_model_properties.push("mesh");
    }

    static serializers: ISerializers = Object.assign({},
        BaseModel.serializers,
        {
            mesh: { deserialize: widgets.unpack_models },
            values: data_union_serialization,
        }
    );
}


export
class WireframeParamsModel extends BaseModel {
    get isWireframeParams() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "WireframeParamsModel",

            enable: true,
            size: 0.01,
            color: "#000000",
            opacity: 1.0,
        });
    }
}


export
class IsovalueParamsModel extends BaseModel {
    get isIsovalueParam() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "IsovalueParamsModel",

            mode: "single", // "single", "linear", "log", "pow"
            value: 0.0,
            num_intervals: 1.0,
            base: 0.0,
            exponent: 2.0,
        });
    }
}


export
class ArrayScalarMapModel extends BaseModel {
    get isArrayScalarMap() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ArrayScalarMapModel",
            values: null,  // ndarray
            //space: "linear",
        });
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.datawidget_properties.push("values");
    }

    static serializers: ISerializers = Object.assign({},
        BaseModel.serializers,
        {
            values: data_union_serialization,
        }
    );
}


export
class ArrayColorMapModel extends BaseModel {
    get isArrayColorMap() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ArrayColorMapModel",
            values: null,  // ndarray
            space: "rgb",
        });
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.datawidget_properties.push("values");
    }

    static serializers: ISerializers = Object.assign({},
        BaseModel.serializers,
        {
            values: data_union_serialization,
        }
    );
}


export
class NamedColorMapModel extends BaseModel {
    get isNamedColorMap() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "NamedColorMapModel",
            name: "viridis",
        });
    }
}


// ------------------------------------------


export
class ScalarConstantModel extends BaseModel {
    get isScalarConstant() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ScalarConstantModel",
            value: 0.0,
        });
    }
}

export
function isScalarConstant(model: any): model is ScalarConstantModel {
    return model.isScalarConstant;
}


export
class ScalarFieldModel extends BaseModel {
    get isScalarField() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ScalarFieldModel",
            field: null,  // FieldModel (maps x -> scalar)
            lut: null,  // ArrayScalarMapModel (maps scalar -> scalar)
        });
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_model_properties.push("field", "lut");
    }

    static serializers: ISerializers = Object.assign({},
        BaseModel.serializers,
        {
            field: { deserialize: widgets.unpack_models },
            lut: { deserialize: widgets.unpack_models },
        }
    );
}

export
function isScalarField(model: any): model is ScalarFieldModel {
    return model.isScalarField;
}


export
class ScalarIndicatorsModel extends BaseModel {
    get isScalarIndicators() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ScalarIndicatorsModel",
            field: null,  // IndicatorFieldModel (maps cell/face -> int)
            lut: null,  // ArrayScalarMapModel  // FIXME: OrdinalScalarMapModel (maps int -> bool/int)
            value: 1,   // integer
        });
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_model_properties.push("field", "lut");
    }

    static serializers: ISerializers = Object.assign({},
        BaseModel.serializers,
        {
            field: { deserialize: widgets.unpack_models },
            lut: { deserialize: widgets.unpack_models },
        }
    );
}

export
function isScalarIndicators(model: any): model is ScalarIndicatorsModel {
    return model.isScalarIndicators;
}


// ------------------------------------------


export
class ColorConstantModel extends BaseModel {
    get isColorConstant() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ColorConstantModel",
            intensity: 1.0,
            color: "#ffffff",
        });
    }

    // static serializers: ISerializers = Object.assign({},
    //     BaseModel.serializers,
    //     {
    //     }
    // );
}

export
function isColorConstant(model: any): model is ColorConstantModel {
    return model.isColorConstant;
}


export
class ColorFieldModel extends BaseModel {
    get isColorField() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ColorFieldModel",
            field: null,  // FieldModel
            lut: null,  // ArrayColorMapModel | NamedColorMapModel
        });
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_model_properties.push("field", "lut");
    }

    static serializers: ISerializers = Object.assign({},
        BaseModel.serializers,
        {
            field: { deserialize: widgets.unpack_models },
            lut: { deserialize: widgets.unpack_models },
        }
    );
}

export
function isColorField(model: any): model is ColorFieldModel {
    return model.isColorField;
}


export
class ColorIndicatorsModel extends BaseModel {
    get isColorIndicators() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ColorIndicatorsModel",
            field: null,  // IndicatorFieldModel
            lut: null,  // ArrayColorMapModel | NamedColorMapModel
        });
    }

    createPropertiesArrays() {
        super.createPropertiesArrays();
        this.child_model_properties.push("field", "lut");
    }

    static serializers: ISerializers = Object.assign({},
        BaseModel.serializers,
        {
            field: { deserialize: widgets.unpack_models },
            lut: { deserialize: widgets.unpack_models },
        }
    );
}

export
function isColorIndicators(model: any): model is ColorIndicatorsModel {
    return model.isColorIndicators;
}

// ------------------------------------------
