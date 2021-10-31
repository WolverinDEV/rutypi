const webpack = require("webpack");
const path = require("path");



const rutypiPath = path.join(__dirname, "..", "dist");
const { RutypiWebpackPlugin } = require(`${rutypiPath}/webpack`);

module.exports = {
    entry: path.join(__dirname, "jest", "index.ts"),
    devtool: "source-map",
    mode: "development",
    plugins: [
        new webpack.CleanPlugin(),
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
        extensions: ['.ts', '.js'],
        alias: {
            "rutypi": path.join(rutypiPath, "index"),
        }
    },
    externals: [ ],
    target: "node",
    output: {
        path: process.env.OUTPUT_PATH || path.resolve(__dirname, "dist"),
        filename: "all.test.js",
    },
};