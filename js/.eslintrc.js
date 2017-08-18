
const off = 'no-throw-literal no-constant-condition brace-style new-cap camelcase comma-dangle keyword-spacing comma-spacing indent key-spacing no-trailing-spaces no-multiple-empty-lines no-multi-spaces quotes semi space-in-parens space-before-function-paren spaced-comment space-infix-ops operator-linebreak';

const enable = 'no-unused-vars eqeqeq padded-blocks';

const addOff = (cur, acc) => Object.assign({ [acc]: "off" }, cur);
const offRules = off.split(" ").reduce(addOff, {});

const rules = {
};
Object.assign(rules, offRules);

module.exports = {
    extends: "standard",
    rules: rules,
    parserOptions: {
        "ecmaVersion": 6,
        "sourceType": "module" 
    }
};


