'use strict';

var widgets = require('jupyter-js-widgets');
var _ = require('underscore');

var utils = require('./utils.js');


class DataDisplayModel extends widgets.DOMWidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'DataDisplayModel',
            _view_name : 'DataDisplayView',
            data : null,
        };
        return _.extend(super.defaults(), utils.module_defaults, model_defaults);
    }
};
DataDisplayModel.serializers = _.extend({
    data: { deserialize: widgets.unpack_models },
}, widgets.DOMWidgetModel.serializers);


class DataDisplayView extends widgets.DOMWidgetView
{
    initialize()
    {
        console.log("DATADISPLAYVIEW INIT", arguments)
        super.initialize(...arguments);
        this.dataview = null;
        this.view_promises = Promise.resolve();
    }

    wire_events()
    {
        // datamodel change -> dataview.update
        //let data = this.model.get("data");
        // datadisplaymodel change -> datadisplaymodel.update
    }

    render()
    {
        console.log("DATADISPLAYVIEW RENDER", arguments)

        // FIXME: Clear old child views and unregister listeners

        let data = this.model.get("data");
        if (data === undefined || data === null) {
            this.el.innerHTML = "<p>No data, couldn't create data display view.</p>";
            return Promise.resolve();
        }

        this.div = document.createElement("div");
        this.el.className = "jupyter-widget jupyter-unray";
        this.el.innerHTML = "";
        this.el.appendChild(this.div);

        let that = this;
        let view_promises = [];

        let p = this.create_child_view(data);

        view_promises.push(
            p.then((dataview) => {
                console.log("SETTING DATAVIEW")
                that.dataview = dataview;
            })
        );

        this.view_promises = Promise.all(view_promises)
            .then(() => {
                console.log("LISTENING TO DATA")
                that.listenTo(this.dataview, "data:dirty", that.on_data_dirty);
                console.log("CALLING DATA DIRTY")
                that.on_data_dirty();
            }).catch((err) => { console.error(err); throw err; });

        return this.view_promises;
    }

    update()
    {
        console.log("DATADISPLAYVIEW UPDATE", arguments)
        super.update(...arguments);

        // Data model replaced: recreate child views and everything
        this.stopListening(null, "data:dirty");
        this.model.previous("data")
        this.render();
    }

    on_data_dirty()
    {
        console.log("DATADISPLAYVIEW on_data_dirty", arguments)
        let dataview = this.dataview;
        let datamodel = dataview.model;
        let array = datamodel.get("array");
        this.div.innerHTML = `<ul>
        <li>shape: ${array.shape}</li>
        <li>stride: ${array.stride}</li>
        <li>offset: ${array.offset}</li>
        <li>data: ${array.data[0]} ${array.data[1]} ${array.data[2]} ...</li>
        </ul>`;
        console.log(array);
    }
};


module.exports = {
    DataDisplayModel, DataDisplayView
};
