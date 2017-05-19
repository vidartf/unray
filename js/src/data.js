var widgets = require('jupyter-js-widgets');
var _ = require('underscore');

var utils = require('./utils.js');


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
        return _.extend(super.defaults(), utils.module_defaults, model_defaults);
    }
};
DataModel.serializers = _.extend({
    array: utils.array_serialization,
}, widgets.WidgetModel.serializers);


class DataView extends widgets.WidgetView
{
    initialize()
    {
        super.initialize(...arguments);
        console.log("DATAVIEW INIT")
    }

    render()
    {
        // Trying to render a DataView, shouldn't happen?
        console.log("DATAVIEW RENDER")
    }

    update(options)
    {
        let name = this.model.get("name");
        let array = this.model.get("array");
        console.log("DATAVIEW UPDATE ", name, array)
        this.trigger("dirty", name, array);
    }
};


module.exports = {
    DataModel, DataView
};
