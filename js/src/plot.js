var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
var THREE = require('three');

var utils = require('./utils.js');


class PlotModel extends widgets.WidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'PlotModel',
            _view_name : 'PlotView',
            name : "unnamed",
            method : "blank",
            encoding : {},
        };
        return _.extend(super.defaults(), utils.module_defaults, model_defaults);
    }

    initialize()
    {
        super.initialize(...arguments);
    }
};
/*
PlotModel.serializers = _.extend({
    //array: utils.array_serialization,
}, widgets.WidgetModel.serializers);
*/


class PlotView extends widgets.WidgetView
{
    initialize()
    {
        super.initialize(...arguments);
    }

    render()
    {
        console.log("PLOTVIEW RENDER")
    }

    update(options)
    {
        //super.update(...arguments);
        let name = this.model.get("name");
        let method = this.model.get("method");
        let encoding = this.model.get("encoding");
        // ...
        console.log("PLOTVIEW UPDATE ", name, method, encoding, this.parent);
        this.trigger("dirty", name, method, encoding);
    }
};


module.exports = {
    PlotModel, PlotView
};
