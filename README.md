# Rutypi a runtime type information and verify library [![Build Status](https://app.travis-ci.com/WolverinDEV/rutypi.svg?branch=master)](https://app.travis-ci.com/WolverinDEV/rutypi) [![Npm package version](https://badgen.net/npm/v/rutypi)](https://npmjs.com/package/rutypi) [![GitHub issues](https://img.shields.io/github/issues/WolverinDEV/rutypi.svg)](https://GitHub.com/WolverinDEV/rutypi/issues/)
Rutypi is a library which allows you to automatically export type information for runtime usage.  
Additionally, it provides a mechanism to check if an object matches it's declared type out of the box.
  
## Requirements
In order to use rutypi you will need
1. Webpack version 5
2. Typescript version 4

## Setup
The setup is done by adding `RutypiWebpackPlugin` to your webpack plugins.  
That's it, you're ready to start!  
  
Minimal Webpack example (`webpack.config.js`):  
```js
const { RutypiWebpackPlugin } = require("rutypi/webpack");

module.exports = {
    entry: './src/index.ts',
    plugins: [
        new RutypiWebpackPlugin(),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: "ts-loader"
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
```

## Usage
The following methods are offered by the runtime library:  
- [`typeInfo`](#typeinfo)
- [`validateType`](#validatetype)
- [`lookupReference`](#lookupreference)

### `typeInfo`
Retrieve type information at runtime about the given type.
Example:
```ts
import { typeInfo, lookupReference } from "rutypi";

type MyType = {
    key: string,
    value: number,
    ref: MyType | undefined
};

/* Value: { type: 'object-reference', target: 'T43_MyType' } */
let info = typeInfo<MyType>();
if(info.type === "object-reference") {
    /*
     * Will print:
     *  {
     *    type: 'object',
     *    members: {
     *      key: { type: 'string' },
     *      value: { type: 'number' },
     *      ref: {
     *        type: 'union',
     *        types: [
     *          { type: 'object-reference', target: 'T43_MyType' },
     *          { type: 'undefined' },
     *          { type: 'null' },
     *        ]
     *      }
     *    },
     *  }
     */
    console.log("Reference output: %o", lookupReference(info));
}
```

### `validateType`
Validate the given object according to the type specification of the given template argument.  
If the object doesn't match the type declaration an error will be thrown or returned.
Example:  
```ts
import { validateType } from "rutypi";

type MyType = {
    key: string,
    value: number,
    ref?: MyType
};

let validatedObject = validateType<MyType>({ key: "a", value: 123 });
```

### `lookupReference`
Lookup type references to other types.  
A type reference in this manner will most likely be a named type or interface.  
An example could be found [here](#typeinfo).  

## Examples
Fully functionally examples can be found within the `examples` folder.  
  
## Limitations
This plugin can not be used with `transpileOnly` setting enabled for `ts-loader`. 
When enabled, the TypeScript compiler will not gather any type information nor index
any `.d.ts` files.