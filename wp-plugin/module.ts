import {Module, RuntimeGlobals, sources} from "webpack";
import {Type, TypeRegistry} from "../shared/types";
import * as _ from "lodash";

export class DatastoreModule extends Module {
    private static kSourceTypes = new Set(["javascript"]);
    private static kRuntimeRequirements = new Set([RuntimeGlobals.exports]);

    private readonly typeInfo: TypeRegistry;

    private typeInfoSnapshotVersion: number;
    private typeInfoSnapshot?: { [key: string]: Type };
    private generatedSource?: sources.Source;

    constructor(typeInfo: TypeRegistry) {
        super("javascript/dynamic", null);

        this.typeInfo = typeInfo;
        this.typeInfoSnapshotVersion = 0;
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
        const rebuildRequired = !_.isEqual(this.typeInfoSnapshot, this.typeInfo.definitions);
        //console.error("needBuild(...) => %o", rebuildRequired);
        callback(
            null,
            rebuildRequired
        );
    }

    invalidateBuild() {
        this.typeInfoSnapshot = undefined;
        this.generatedSource = undefined;
    }

    build(options, compilation, resolver, fs, callback) {
        this.buildInfo = {};
        this.buildMeta = {};
        this.dependencies.length = 0;

        /* TODO: Only insert type definition called from module which are actually included in this webpack build. */
        this.typeInfoSnapshotVersion++;
        this.typeInfoSnapshot = _.clone(this.typeInfo.definitions);
        this.generatedSource = undefined;

        callback();
    }

    size(/* type: string */) {
        return this.generateSource().size();
    }

    codeGeneration(/* context: CodeGenerationContext */) {
        const result = new Map<string, sources.Source>();
        result.set("javascript", this.generateSource());
        return {
            sources: result,
            runtimeRequirements: DatastoreModule.kRuntimeRequirements
        } as any;
    }

    updateHash(hash, context) {
        hash.update(this.identifier());
        hash.update(this.typeInfoSnapshotVersion.toString());
        super.updateHash(hash, context);
    }

    private generateSource(): sources.Source {
        if(this.generatedSource) {
            return this.generatedSource;
        }

        let jsonObject = JSON.stringify({
            knownTypes: this.typeInfoSnapshot
        });

        this.generatedSource = new sources.RawSource(`Object.defineProperty(exports, "__esModule", { value: true }); exports.default = ${jsonObject};`);
        return this.generatedSource;
    }
}