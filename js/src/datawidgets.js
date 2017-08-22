'use strict';

import widgets from '@jupyter-widgets/base';
import {data_union_serialization, data_union_array_serialization} from 'jupyter-datawidgets';
import version from './version';


class MeshModel extends widgets.WidgetModel {
    defaults() {
        return Object.assign(super.defaults(), version.module_defaults, {
            _model_name : 'MeshModel',
            auto_orient: true,
            cells: null,  // ndarray
            points: null,  // ndarray
        });
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);

        // Get any change events
        this.on('change', this.onChange, this);
    }

    onChange(model, options) {
        // Let backbone tell us which attributes have changed
        const changed = model.changedAttributes();

        console.log("Mesh::onChange", model, options, changed);

        // TODO: Reorient cells on change event
    }
};
MeshModel.serializers = Object.assign({
    cells: data_union_serialization,
    points: data_union_serialization,
}, widgets.WidgetModel.serializers);


// TODO: Add classes mirroring datawidgets.py here

export {
    MeshModel,
};
