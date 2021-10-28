// A JavaScript class.
import * as webpack from "webpack";
import * as tsloaderInstances from "ts-loader/dist/instances";
import tsTransformer from "./transformer";
import { TSInstance } from "ts-loader/dist/interfaces";
import { LoaderOptions } from "ts-loader/dist/interfaces";

export default class RutypiWebpackPlugin {
    apply(compiler: webpack.Compiler) {
        /* Hook each ts-compiler with our custom transformer */
        {
            const original = tsloaderInstances.initializeInstance;
            Object.assign(tsloaderInstances, {
                initializeInstance: function (loader: webpack.LoaderContext<LoaderOptions>, instance: TSInstance) {
                    if(!instance.initialSetupPending) {
                        return;
                    }
                    original(loader, instance);

                    if(loader._compiler !== compiler) {
                        // TODO: Add support for multiple compiler
                        throw "not implemented";
                    }

                    const program = instance.program || instance.languageService.getProgram();
                    const transformers = instance.transformers || (instance.transformers = {});
                    const transformerArray = transformers.before || (transformers.before = []);
                    transformerArray.push(tsTransformer(program));

                    console.error("setTSInstanceInCache");
                }
            });
        }

        /*
        compiler.hooks.thisCompilation.tap("RutypiWebpackPlugin", (compilation, { normalModuleFactory }) => {
            normalModuleFactory.hooks.factory.tap("RutypiWebpackPlugin", factory => (data, callback) => {
                if(data.request.startsWith(this.options.modulePrefix)) {
                    const configName = data.request.substr(this.options.modulePrefix.length);
                    if(this.options.configurations[configName] === undefined) {
                        callback("Missing SVG configuration " + configName);
                        return;
                    }
                    callback(null, new SvgSpriteModule(data.request, this.options, configName, this.options.configurations[configName]));
                    return;
                }

                factory(data, callback);
            });
        });
        */
    }
}