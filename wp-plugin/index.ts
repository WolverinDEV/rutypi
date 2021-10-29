// A JavaScript class.
import * as webpack from "webpack";
import * as tsloaderInstances from "ts-loader/dist/instances";
import * as tsloaderUtils from "ts-loader/dist/utils";
import tsTransformer from "./transformer";
import { TSInstance } from "ts-loader/dist/interfaces";
import { LoaderOptions } from "ts-loader/dist/interfaces";
import {DatastoreModule} from "./module";
import {TypeRegistry} from "rutypi-sharedlib/types";
import { Program } from "typescript";

export class RutypiWebpackPlugin {
    private readonly typeRegistry: TypeRegistry;
    private readonly refCurrentProgram: { current: Program };

    constructor() {
        this.typeRegistry = { };
        this.refCurrentProgram = { current: undefined };
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
                        throw new Error("multi compiler support not yet implemented");
                    }

                    if(instance.loaderOptions.transpileOnly) {
                        /* FIXME: Re-enable this! */
                        //throw new Error("rutypi can not work in transpileOnly mode");
                    }

                    const transformers = instance.transformers || (instance.transformers = {});
                    const transformerArray = transformers.before || (transformers.before = []);
                    transformerArray.push(tsTransformer(this.refCurrentProgram, this.typeRegistry));
                }
            });
        }

        /*
         * In webpack watch mode, the program changes every time when we call ensureProgram.
         * Since we need the program to access the TypeChecker we need to keep a reference to the currently used program.
         */
        {
            const original = tsloaderUtils.ensureProgram;
            Object.assign(tsloaderUtils, {
                ensureProgram: (instance: TSInstance) => {
                    const program = original(instance);
                    this.refCurrentProgram.current = program;
                    return program;
                }
            });
        }

        compiler.hooks.thisCompilation.tap("RutypiWebpackPlugin", (compilation, { normalModuleFactory }) => {
            let moduleInstance: DatastoreModule;
            compilation.hooks.rebuildModule.tap("RutypiWebpackPlugin", module => {
                if(module === moduleInstance || !moduleInstance) {
                    return;
                }

                /* Force the compiler to check for a rebuild of this module every time when anything changed. */
                compilation.rebuildModule(moduleInstance, () => {});
            });

            normalModuleFactory.hooks.factorize.tap("RutypiWebpackPlugin", data => {
                if(data.request === "rutypi-datastore") {
                    return moduleInstance = new DatastoreModule(this.typeRegistry);
                }

                return undefined;
            });
        });
    }
}

export default RutypiWebpackPlugin;