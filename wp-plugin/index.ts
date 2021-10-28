// A JavaScript class.
import * as webpack from "webpack";
import * as tsloaderInstances from "ts-loader/dist/instances";
import tsTransformer from "./transformer";
import { TSInstance } from "ts-loader/dist/interfaces";
import { LoaderOptions } from "ts-loader/dist/interfaces";
import {DatastoreModule} from "./module";
import {TypeRegistry} from "rutypi-sharedlib/types";
import {Module} from "webpack";

export class RutypiWebpackPlugin {
    private readonly typeRegistry: TypeRegistry;

    constructor() {
        this.typeRegistry = { };
    }

    apply(compiler: webpack.Compiler) {
        /* Hook each ts-compiler with our custom transformer */
        {
            const original = tsloaderInstances.initializeInstance;
            Object.assign(tsloaderInstances, {
                initializeInstance: (loader: webpack.LoaderContext<LoaderOptions>, instance: TSInstance) => {
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
                    transformerArray.push(tsTransformer(program, this.typeRegistry));

                    console.error("setTSInstanceInCache");
                }
            });
        }

        compiler.hooks.thisCompilation.tap("RutypiWebpackPlugin", (compilation, { normalModuleFactory }) => {
            normalModuleFactory.hooks.factorize.tap("RutypiWebpackPlugin", data => {
                if(data.request === "rutypi-datastore") {
                    return new DatastoreModule(this.typeRegistry);
                }

                return undefined;
            });
        });
    }
}

export default RutypiWebpackPlugin;