'use strict';

var widgets = require('@jupyter-widgets/base');
var _ = require('underscore');
var THREE = require('three');

var version = require('./version.js');
// var serialization = require('./serialization.js');


class PlotModel extends widgets.WidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'PlotModel',
            _view_name : 'PlotView',

            name : "unnamed",
            method : "surface",
            encoding : {},
        };
        return _.extend(super.defaults(), version.module_defaults, model_defaults);
    }

    initialize()
    {
        super.initialize(...arguments);
    }
};
/*
PlotModel.serializers = _.extend({
    //array: serialization.array_serialization,
}, widgets.WidgetModel.serializers);
*/


class PlotView extends widgets.WidgetView
{
    initialize()
    {
        super.initialize(...arguments);
        console.log("PlotView initialize")

        // TODO: Setup empty datastructures
        // this.method = "blank";
        // this.encoding = {};
    }

    render()
    {
        console.log("PlotView render (shouldn't happen? this is not a DOMWidgetView)")
    }

    update(options)
    {
        //super.update(...arguments);

        // this.method = this.model.get("method");
        // this.encoding = this.model.get("encoding");
        // console.log("PlotView update ", this.method, this.encoding, this.parent);

        // TODO: Preparations for redraw that don't need to happen twice if two redraws happen before the next update

        // Tell listening figure that this plot needs to be refreshed
        this.trigger("plot:dirty", this);
    }

    process()
    {
        console.log("PlotView process")

        // TODO: Perform precomputations, i.e. 
    }

    redraw()
    {
        console.log("PlotView process")

        // TODO: Render current state
        // switch (this.method)
        // {
        // case "blank":
        //     break;
        // case "surface":
        //     break;
        // default:
        //     console.error("Plot method not implemented", this.method);
        // }
    }

};


module.exports = {
    PlotModel, PlotView
};
