'use strict';

var widgets = require('@jupyter-widgets/base');
var _ = require('underscore');

var version = require('./version.js');
var serialization = require('./serialization.js');


class DataModel extends widgets.WidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'DataModel',
            _view_name : 'DataView',
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
    array: serialization.array_serialization,
}, widgets.WidgetModel.serializers);


class DataView extends widgets.WidgetView
{
    initialize()
    {
        super.initialize(...arguments);
    }

    render()
    {
    }

    update(options)
    {
    }
};


module.exports = {
    DataModel, DataView
};
