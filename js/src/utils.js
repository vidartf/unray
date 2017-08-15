'use strict';

function arange(n) {
    const arr = new Float32Array(n);
    for (let i = 0; i < n; ++i) {
        arr[i] = i;
    }
    return arr;
}

function extend2(defaults, params) {
    const p = Object.assign({}, defaults);
    for (let key in params) {
        Object.assign(p[key], params[key]);
    }
    return p;
}

export {
    arange,
    extend2
};
