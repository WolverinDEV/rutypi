import { Type, TypeChecker, Node } from "typescript";
import { Type as TType } from "rutypi-sharedlib/types";
declare type TypeDisplayContext = {
    typeChecker: TypeChecker;
    prefix: string;
    depth: number;
    references: {
        [key: string]: TType;
    };
};
export declare const describeNode: (node: Node, ctx: TypeDisplayContext) => TType;
export declare const describeType: (type: Type, ctx: TypeDisplayContext) => TType;
export {};
