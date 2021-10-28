import {Module, RuntimeGlobals, sources} from "webpack";
import {TypeRegistry} from "rutypi-sharedlib/types";
import * as _ from "lodash";

export class DatastoreModule extends Module {
    private static kSourceTypes = new Set(["javascript"]);
    private static kRuntimeRequirements = new Set([RuntimeGlobals.exports]);

    private readonly typeInfo: TypeRegistry;

    private typeInfoBuildSnapshot?: TypeRegistry;
    private generatedSource?: sources.Source;

    constructor(typeInfo: TypeRegistry) {
        super("javascript/dynamic", null);
        this.typeInfo = typeInfo;
    }

    identifier() {
        return "rutypi generated datastore";
    }

    readableIdentifier(/* requestShortener RequestShortener */): string {
        return this.identifier();
    }

    getSourceTypes() {
        return DatastoreModule.kSourceTypes;
    }

    needBuild(context, callback) {
        callback(
            null,
            !_.isEqual(this.typeInfoBuildSnapshot, this.typeInfo)
        );
    }

    invalidateBuild() {
        this.typeInfoBuildSnapshot = undefined;
        this.generatedSource = undefined;
    }

    build(options, compilation, resolver, fs, callback) {
        this.buildInfo = {};
        this.buildMeta = {};
        this.dependencies.length = 0;

        this.typeInfoBuildSnapshot = _.clone(this.typeInfo);
        this.generatedSource = undefined;

        callback();
    }

    size(/* type: string */) {
        return this.generateSource().size();
    }

    codeGeneration(/* context: CodeGenerationContext */) {
        console.error("-------- Code gen!");
        const result = new Map<string, sources.Source>();
        result.set("javascript", this.generateSource());
        return {
            sources: result,
            runtimeRequirements: DatastoreModule.kRuntimeRequirements
        } as any;
    }

    private generateSource(): sources.Source {
        if(this.generatedSource) {
            return this.generatedSource;
        }

        this.generatedSource = new sources.RawSource("exports.default = " + JSON.stringify({
            knownTypes: this.typeInfo
        }) + ";");

        return this.generatedSource;
    }
}