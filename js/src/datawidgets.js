"use strict";

//import _ from "underscore";

import { module_defaults } from "./version";
import widgets from "@jupyter-widgets/base";
import {
    getArrayFromUnion, data_union_serialization, listenToUnion
} from "jupyter-datawidgets";


export
class MeshModel extends widgets.WidgetModel {
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

    onChange(model, options) {
        super.onChange(model, options);
        // Let backbone tell us which attributes have changed
        const changed = this.changedAttributes();

        console.log("Mesh::onChange", model, options, changed);

        // TODO: Reorient cells on change event
    }
};
MeshModel.serializers = Object.assign({},
    widgets.WidgetModel.serializers,
    {
        cells: data_union_serialization,
        points: data_union_serialization,
    }
);


export
class FieldModel extends widgets.WidgetModel {
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
}
FieldModel.serializers = Object.assign({},
    widgets.WidgetModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models },
        values: data_union_serialization,
    }
);


export
class IndicatorFieldModel extends widgets.WidgetModel {
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
}
IndicatorFieldModel.serializers = Object.assign({},
    widgets.WidgetModel.serializers,
    {
        mesh: { deserialize: widgets.unpack_models },
        values: data_union_serialization,
    }
);


export
class WireframeParamsModel extends widgets.WidgetModel {
    get isWireframeParams() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "WireframeParamsModel",

            enable: true,
            size: 0.001,
            color: "#000000",
            opacity: 1.0,
            decay: 0.5,
        });
    }
}


export
class IsovalueParamsModel extends widgets.WidgetModel {
    get isIsovalueParam() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "IsovalueParamsModel",

            mode: "single", // "single", "linear", "log", "power", "sweep"
            value: 0.0,
            num_intervals: 0,
            spacing: 1.0,
            period: 3.0,
        });
    }
}


export
class ArrayScalarLUTModel extends widgets.WidgetModel {
    get isArrayScalarLUT() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ArrayScalarLUTModel",
            values: null,  // ndarray
            //space: "linear",
        });
    }
}
ArrayScalarLUTModel.serializers = Object.assign({},
    widgets.WidgetModel.serializers,
    {
        values: data_union_serialization,
    }
);


export
class ArrayColorLUTModel extends widgets.WidgetModel {
    get isArrayColorLUT() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ArrayColorLUTModel",
            values: null,  // ndarray
            space: "rgb",
        });
    }
}
ArrayColorLUTModel.serializers = Object.assign({},
    widgets.WidgetModel.serializers,
    {
        values: data_union_serialization,
    }
);


export
class NamedColorLUTModel extends widgets.WidgetModel {
    get isNamedColorLUT() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "NamedColorLUTModel",
            name: "viridis",
        });
    }
}


// ------------------------------------------


export
class ScalarConstantModel extends widgets.WidgetModel {
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
class ScalarFieldModel extends widgets.WidgetModel {
    get isScalarField() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ScalarFieldModel",
            field: null,  // FieldModel
            lut: null,  // ArrayScalarLUTModel | NamedScalarLUTModel
        });
    }
}
ScalarFieldModel.serializers = Object.assign({},
    widgets.WidgetModel.serializers,
    {
        field: { deserialize: widgets.unpack_models },
        lut: { deserialize: widgets.unpack_models },
    }
);


export
class ScalarIndicatorsModel extends widgets.WidgetModel {
    get isScalarIndicators() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ScalarIndicatorsModel",
            field: null,  // IndicatorFieldModel
            lut: null,  // ArrayScalarLUTModel | NamedScalarLUTModel
        });
    }
}
ScalarIndicatorsModel.serializers = Object.assign({},
    widgets.WidgetModel.serializers,
    {
        field: { deserialize: widgets.unpack_models },
        lut: { deserialize: widgets.unpack_models },
    }
);


// ------------------------------------------


export
class ColorConstantModel extends widgets.WidgetModel {
    get isColorConstant() { return true; }
    
    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ColorConstantModel",
            intensity: 1.0,
            color: "#ffffff",
        });
    }
}
// ColorConstantModel.serializers = Object.assign({},
//     widgets.WidgetModel.serializers,
//     {
//     }
// );


export
class ColorFieldModel extends widgets.WidgetModel {
    get isColorField() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ColorFieldModel",
            field: null,  // FieldModel
            lut: null,  // ArrayColorLUTModel | NamedColorLUTModel
        });
    }
}
ColorFieldModel.serializers = Object.assign({},
    widgets.WidgetModel.serializers,
    {
        field: { deserialize: widgets.unpack_models },
        lut: { deserialize: widgets.unpack_models },
    }
);


export
class ColorIndicatorsModel extends widgets.WidgetModel {
    get isColorIndicators() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ColorIndicatorsModel",
            field: null,  // IndicatorFieldModel
            lut: null,  // ArrayColorLUTModel | NamedColorLUTModel
        });
    }
}
ColorIndicatorsModel.serializers = Object.assign({},
    widgets.WidgetModel.serializers,
    {
        field: { deserialize: widgets.unpack_models },
        lut: { deserialize: widgets.unpack_models },
    }
);

// ------------------------------------------