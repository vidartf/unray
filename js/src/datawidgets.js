'use strict';

import widgets from '@jupyter-widgets/base';
import {data_union_serialization, getArrayFromUnion, listenToUnion} from 'jupyter-datawidgets';
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


    createPropertiesArrays() {
        super.createPropertiesArrays();

        // This will ensure changes to the data in these trigger a change event
        // regardless of whether they are arrays or datawidgets:
        // The change events will trigger a rerender when object is added to scene
        this.datawidget_properties.push('cells', 'points');
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


// TODO: Add classes mirroring datawidgets.py here

export {
    MeshModel,
};
