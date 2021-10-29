import * as ts from "typescript";
import { SourceFile, TransformationContext } from "typescript";
import { TypeRegistry } from "rutypi-sharedlib/types";
declare const createTransformer: (refProgram: {
    current: ts.Program;
}, registry: TypeRegistry) => (ctx: TransformationContext) => (node: SourceFile) => ts.SourceFile;
export default createTransformer;
