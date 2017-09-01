'use strict';


import widgets from '@jupyter-widgets/base';

//import _ from 'underscore';

import version from './version';

import {
    getArrayFromUnion, data_union_serialization
} from 'jupyter-datawidgets';



export
class FieldModel extends widgets.WidgetModel {
    defaults() {
        return Object.assign(super.defaults(),
            version.module_defaults, {
            _model_name : 'FieldModel',
            mesh: null,
            values: null,
            space: 'P1',
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
class ArrayColorLUTModel extends widgets.WidgetModel {
    defaults() {
        return Object.assign(super.defaults(),
            version.module_defaults, {
            _model_name : 'ArrayColorLUTModel',
            values: null,
            space: 'rgb',
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
class ColorFieldModel extends widgets.WidgetModel {
    defaults() {
        return Object.assign(super.defaults(),
            version.module_defaults, {
            _model_name : 'ColorFieldModel',
            field: null,
            lut: null,
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
