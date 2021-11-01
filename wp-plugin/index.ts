import * as webpack from "webpack";
import { DatastoreModule } from "./module";
import { TypeRegistry } from "../shared/types";
import tsTransformer from "./transformer";
import type { Program } from "typescript";
import type { TSInstance } from "ts-loader/dist/interfaces";
import type { LoaderOptions } from "ts-loader/dist/interfaces";

declare const __non_webpack_require__;
export class RutypiWebpackPlugin {
    private readonly typeRegistry: TypeRegistry;
    private readonly refCurrentProgram: { current: Program };

    constructor() {
        this.typeRegistry = {
            definitions: {},
            definitionReferences: {}
        };
        this.refCurrentProgram = { current: undefined };
    }

    apply(compiler: webpack.Compiler) {
        /*
         * We need to use the resolve function of our parent module so we ensure that we're using their ts-loader
         * instance as well. If we would not do this and symbolically link rutypi we may resolve ts-loader differently
         * that webpack would.
         */
        let projectModule;
        try {
            /* __non_webpack_require__ might not be defined when using the plugin from source */
            projectModule = __non_webpack_require__.main;
        } catch {}
        projectModule = projectModule || module;

        /* Hook each ts-compiler with our custom transformer. */
        {
            const tsloaderInstances = projectModule.require("ts-loader/dist/instances");
            if(typeof tsloaderInstances.initializeInstance !== "function") {
                throw new Error("ts-loader missing function initializeInstance in instances. Please ensure that you have the latest ts-loader version!");
            }

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
                        const logger = loader._compilation.getLogger("rutypi");
                        logger.warn("Rutypi will not work property with ts-loader in transpileOnly mode!");
                    }

                    const transformers = instance.transformers || (instance.transformers = {});
                    const transformerArray = transformers.before || (transformers.before = []);
                    transformerArray.push(tsTransformer(this.refCurrentProgram, loader._compilation, this.typeRegistry));
                }
            });
        }

        /*
         * In webpack watch mode, the program changes every time when we call ensureProgram.
         * Since we need the program to access the TypeChecker we need to keep a reference to the currently used program.
         */
        {
            const tsloaderUtils = projectModule.require("ts-loader/dist/utils");
            if(typeof tsloaderUtils.ensureProgram !== "function") {
                throw new Error("ts-loader missing function ensureProgram in utils. Please ensure that you have the latest ts-loader version!");
            }

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