'use strict';

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

        let array = this.model.get("array");
        let shape = array.shape;

        this.size = shape[0];
        if (shape.length === 1) {
            this.item_size = 1;
        } else if (shape.length === 2) {
            this.item_size = shape[1];
        } else {
            throw "Unsupported shape " + shape;
        }

        let [width, height] = compute_texture_size(this.size);
        this.width = width;
        this.height = height;

        this.size = 0;
        this.item_size = 0;
        this.width = 0;
        this.height = 0;

        const formats = {
            1: THREE.AlphaFormat,
            3: THREE.RGBFormat,
            4: THREE.RGBAFormat
        };

        const types = {
            "float32": THREE.FloatType,
            "uint32": THREE.UnsignedIntType,
            "int32": THREE.IntType
        };

        this.dtype = fixme;  // array.data


        this.format = null;
        this.internal_format = null;
        this.type = null;

        /*
        this.texture = new THREE.DataTexture(
            array.data, this.width, this.height,
            formats[this.item_size], types[dtype],
            mapping,
            THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
            THREE.NearestFilter, THREE.NearestFilter,
            false);
        */

        // TODO: Create a subclass of DataTexture, overloading suitable
        // functions to reuse padded arrays for data uploads?
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
    }

    render()
    {
    }

    create_texture()
    {
        const formats = {
            1: THREE.AlphaFormat,
            3: THREE.RGBFormat,
            4: THREE.RGBAFormat
        };

        const types = {
            "float32": THREE.FloatType,
            "uint32": THREE.UnsignedIntType,
            "int32": THREE.IntType
        };

        let array = this.model.get("array");
        let dtype = fixme;
        this.item_size = fixme;
        this.size = fixme;

        let [width, height] = compute_texture_size(this.size);
        this.width = width;
        this.height = height;

        this.texture = new THREE.DataTexture(
            array.buffer, this.width, this.height,
            formats[this.item_size], types[dtype],
            mapping,
            THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
            THREE.NearestFilter, THREE.NearestFilter,
            false);

        // TODO: Create a subclass of DataTexture, overloading suitable
        // functions to reuse padded arrays for data uploads?
    }

    update(options)
    {
        let name = this.model.get("name");
        let array = this.model.get("array");
        console.log("DATAVIEW UPDATE ", name, array)

        // TODO: Only when format or size changes
        //this.create_texture();

        this.trigger("data:dirty", this);
    }
};


module.exports = {
    DataModel, DataView
};
