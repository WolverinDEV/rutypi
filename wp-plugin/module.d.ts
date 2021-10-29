import { Module } from "webpack";
import { TypeRegistry } from "rutypi-sharedlib/types";
export declare class DatastoreModule extends Module {
    private static kSourceTypes;
    private static kRuntimeRequirements;
    private readonly typeInfo;
    private typeInfoSnapshotVersion;
    private typeInfoSnapshot?;
    private generatedSource?;
    constructor(typeInfo: TypeRegistry);
    identifier(): string;
    readableIdentifier(): string;
    getSourceTypes(): Set<string>;
    needBuild(context: any, callback: any): void;
    invalidateBuild(): void;
    build(options: any, compilation: any, resolver: any, fs: any, callback: any): void;
    size(): number;
    codeGeneration(): any;
    updateHash(hash: any, context: any): void;
    private generateSource;
}
