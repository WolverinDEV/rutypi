const webpack = require("webpack");
const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: {
        webpack: {
            import: "./wp-plugin/index.ts",
            filename: "webpack.js"
        },
        runtime: {
            import: "./src/index.ts",
            filename: "index.js"
        },
    },
    devtool: "source-map",
    mode: process.env.NODE_ENV === "development" ? "development" : "production",
    plugins: [
        new webpack.CleanPlugin(),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(__dirname, "package.json"),
                    to: path.join(__dirname, "dist")
                },
                {
                    from: path.join(__dirname, "package-lock.json"),
                    to: path.join(__dirname, "dist")
                },
                {
                    from: path.join(__dirname, ".npmignore"),
                    to: path.join(__dirname, "dist")
                },
                {
                    from: path.join(__dirname, "readme.md"),
                    to: path.join(__dirname, "dist")
                },
                {
                    from: path.join(__dirname, "typefix/"),
                    to: path.join(__dirname, "dist/")
                },
            ]
        })
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
        alias: {
            "rutypi": path.join(__dirname, "src", "index.ts"),
        }
    },
    externals: [
        (_, request, callback) => {
            if(request.match(/^webpack(-sources)?(\/.*|$).*/) || request.match(/^ts-loader(\/.*)$/)) {
                callback(null, "commonjs " + request);
            } else {
                callback();
            }
        },
        {
            "typescript": "commonjs typescript",
            "ts-loader": "commonjs ts-loader",
            "rutypi-datastore": "commonjs rutypi-datastore",
            "fs-extra": "commonjs fs-extra",
            "path": "commonjs path"
        }
    ],

    target: "node",
    output: {
        path: process.env.OUTPUT_PATH || path.resolve(__dirname, "dist"),
        filename: "plugin.js",

        libraryTarget: "umd",
        library: "rutypi"
    },
};