"use strict";

//import _ from "underscore";

import { module_defaults } from "./version";
import widgets from "@jupyter-widgets/base";
import {
    getArrayFromUnion, data_union_serialization, listenToUnion
} from "jupyter-datawidgets";


export
class MeshModel extends widgets.WidgetModel {
    get is_Mesh() { return true; }

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
    get is_Field() { return true; }

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
    get is_IndicatorField() { return true; }

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
    get is_WireframeParams() { return true; }

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
class ArrayScalarLUTModel extends widgets.WidgetModel {
    get is_ArrayScalarLUT() { return true; }

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


// export
// class NamedScalarLUTModel extends widgets.WidgetModel {
//     get is_NamedScalarLUT() { return true; }

//     defaults() {
//         return Object.assign(super.defaults(),
//             module_defaults, {
//             _model_name : "NamedScalarLUTModel",
//             name: "linear",
//         });
//     }
// }
// NamedScalarLUTModel.serializers = Object.assign({},
//     widgets.WidgetModel.serializers,
//     {
//     }
// );


export
class ArrayColorLUTModel extends widgets.WidgetModel {
    get is_ArrayColorLUT() { return true; }

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
    get is_NamedColorLUT() { return true; }

    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "NamedColorLUTModel",
            name: "viridis",
        });
    }
}
// NamedColorLUTModel.serializers = Object.assign({},
//     widgets.WidgetModel.serializers,
//     {
//     }
// );


// ------------------------------------------


export
class ScalarConstantModel extends widgets.WidgetModel {
    get is_ScalarConstant() { return true; }
    
    defaults() {
        return Object.assign(super.defaults(),
            module_defaults, {
            _model_name : "ScalarConstantModel",
            value: 1.0,
        });
    }
}
// ScalarConstantModel.serializers = Object.assign({},
//     widgets.WidgetModel.serializers,
//     {
//     }
// );


export
class ScalarFieldModel extends widgets.WidgetModel {
    get is_ScalarField() { return true; }

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
    get is_ScalarIndicators() { return true; }

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
    get is_ColorConstant() { return true; }
    
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
    get is_ColorField() { return true; }

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
    get is_ColorIndicators() { return true; }

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