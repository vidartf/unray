'use strict';

import widgets from '@jupyter-widgets/base';
import version from './version';

class MeshModel extends widgets.WidgetModel {
    defaults() {
        return Object.assign(super.defaults(), version.module_defaults, {
            _model_name : 'MeshModel',
            cells: null,  // ndarray
            points: null,  // ndarray
            auto_orient: true,
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

// TODO: Add classes mirroring datawidgets.py here

export {
    MeshModel,
};
