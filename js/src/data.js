'use strict';

import widgets from '@jupyter-widgets/base';
import _ from 'underscore';

import version from './version.js';
import {array_serialization} from './serialization.js';


class DataModel extends widgets.WidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'DataModel',
            name : "unnamed",
            array : null,
        };
        return _.extend(super.defaults(), version.module_defaults, model_defaults);
    }

    initialize()
    {
        super.initialize(...arguments);
        this.wire_events();
    }

    wire_events()
    {
        this.on("change:name", this.on_change_name, this);
        this.on("change:array", this.on_change_array, this);
    }

    on_change_name()
    {
        console.log("DATAMODEL on_change_name");
    }

    on_change_array()
    {
        console.log("DATAMODEL on_change_array");
    }
};
DataModel.serializers = _.extend({
    array: array_serialization,
}, widgets.WidgetModel.serializers);


export {
    DataModel
};
