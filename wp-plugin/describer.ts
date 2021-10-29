import {
    NumberLiteralType, ObjectFlags,
    ObjectType, PropertySignature,
    StringLiteralType, Symbol, SymbolFlags, SyntaxKind,
    Type, TypeAliasDeclaration,
    TypeChecker,
    TypeFlags,
    TypeParameter, TypeParameterDeclaration, TypeReference,
    Node,
    UnionTypeNode,
    ParenthesizedTypeNode
} from "typescript";
import {Type as TType} from "../shared/types";
import {displayFlags} from "./utils";

type TypeDisplayContext = {
    typeChecker: TypeChecker,

    prefix: string,
    depth: number,

    references: {
        [key: string]: TType
    },
}

const mapToTypeAndProceed = (node: Node, ctx: TypeDisplayContext) => {
    const type = ctx.typeChecker.getTypeAtLocation(node);
    return describeType(type, ctx);
}

const NodeDescribeMap: {
    [K in SyntaxKind]?: TType | ((node: Node, ctx: TypeDisplayContext) => TType)
} = {};

NodeDescribeMap[SyntaxKind.UnionType] = (node: UnionTypeNode, ctx) => {
    return {
        type: "union",
        types: node.types.map(node => describeNode(node, ctx))
    }
};

NodeDescribeMap[SyntaxKind.IntersectionType] = (node: UnionTypeNode, ctx) => {
    return {
        type: "union",
        types: node.types.map(node => describeNode(node, ctx))
    }
};

NodeDescribeMap[SyntaxKind.ParenthesizedType] = (node: ParenthesizedTypeNode, ctx) => describeNode(node.type, ctx);
NodeDescribeMap[SyntaxKind.UndefinedKeyword] = { type: "undefined" };
NodeDescribeMap[SyntaxKind.NullKeyword] = { type: "null" };
NodeDescribeMap[SyntaxKind.UnknownKeyword] = { type: "unknown" };
NodeDescribeMap[SyntaxKind.StringKeyword] = { type: "string" };
NodeDescribeMap[SyntaxKind.NumberKeyword] = { type: "number" };
NodeDescribeMap[SyntaxKind.LiteralType] = mapToTypeAndProceed;
NodeDescribeMap[SyntaxKind.TypeReference] = mapToTypeAndProceed;
NodeDescribeMap[SyntaxKind.TypeLiteral] = mapToTypeAndProceed;

export const describeNode = (node: Node, ctx: TypeDisplayContext): TType => {
    let result = NodeDescribeMap[node.kind];
    if(result === undefined) {
        /* TODO: This as backup */
        /* typeChecker.getTypeFromTypeNode(typeNode) */
        throw "unknown how to describe node " + SyntaxKind[node.kind];
    } else if(typeof result === "object") {
        return result;
    } else {
        return result(node, ctx);
    }
}

const TypeDescribeMap: {
    [K in TypeFlags]?: TType | ((type: Type, ctx: TypeDisplayContext) => TType)
} = {};
TypeDescribeMap[TypeFlags.Any] = { type: "any" };
TypeDescribeMap[TypeFlags.Null] = { type: "null" };
TypeDescribeMap[TypeFlags.Unknown] = { type: "unknown" };
TypeDescribeMap[TypeFlags.Void] = { type: "void" };
TypeDescribeMap[TypeFlags.String] = { type: "string" };
TypeDescribeMap[TypeFlags.StringLiteral] = (type: StringLiteralType) => ({ type: "string", value: type.value });
TypeDescribeMap[TypeFlags.Number] = { type: "number" };
TypeDescribeMap[TypeFlags.NumberLiteral] = (type: NumberLiteralType) => ({ type: "number", value: type.value });
TypeDescribeMap[TypeFlags.Boolean] = { type: "boolean" };
TypeDescribeMap[TypeFlags.BooleanLiteral] = (type: object) => ({ type: "boolean", value: type["intrinsicName"] === "true" });
TypeDescribeMap[TypeFlags.TypeParameter] = (type: TypeParameter) => ({ type: "type-reference", target: type.symbol.name, typeArguments: [] });
TypeDescribeMap[TypeFlags.Object] = (type: ObjectType, ctx) => {
    let typeArguments = type.aliasTypeArguments?.map(type => describeType(type, ctx));
    let referenceResult: TType & { type: "object-reference" } = {
        type: "object-reference",
        target: "will be set later",
        typeArguments
    };

    let referenceId;
    if(type.objectFlags & ObjectFlags.Anonymous) {
        /* Serialize this in line or as a reference */
        referenceId = type.aliasSymbol ? "T" + type.symbol["id"] + "_" + type.aliasSymbol.name : undefined;
    } else if(type.objectFlags & ObjectFlags.Class) {
        throw "classes are not allowed";
    } else if(type.objectFlags & ObjectFlags.Interface) {
        /*
         * All right, can be serialized and will be put in as a reference.
         * If there are any template arguments a "Reference" will be used instead of aliasTypeArguments.
         */
        referenceId = "I" + type.symbol["id"] + "_" + type.symbol.name;
    } else if(type.objectFlags & ObjectFlags.Reference) {
        const typeReference = type as TypeReference;
        let result = describeType(typeReference.target, ctx);
        if(result.type !== "object-reference") {
            /* a reference should be pointing to some kind of object which will return a reference. */
            throw "this seems to be a bug in the compiler";
        }

        return {
            type: "object-reference",
            target: result.target,
            typeArguments: typeReference.typeArguments?.map(type => describeType(type, ctx)) || []
        };
    } else {
        throw "unknown object flags " + displayFlags(type.objectFlags, ObjectFlags);
    }

    let objectInfo: TType = {
        type: "object",
        extends: [],
        members: {},
        optionalMembers: {},
        typeArgumentNames: []
    };

    referenceResult.target = referenceId;
    if(referenceId in ctx.references) {
        return referenceResult;
    } else if(referenceId) {
        ctx.references[referenceId] = objectInfo;
    }

    {
        let innerContext = { ...ctx };
        innerContext.prefix = referenceId ? "" : innerContext.prefix + "  ";
        innerContext.depth += 1;

        /* Type parameter specification for type alias */
        if(type.aliasSymbol) {
            if(type.aliasSymbol.declarations.length !== 1) {
                throw "alias symbol is expected to contain exactly one declaration";
            }

            const typeAlias = type.aliasSymbol.declarations[0] as TypeAliasDeclaration;
            if(typeAlias.kind != SyntaxKind.TypeAliasDeclaration) {
                throw "alias symbol declaration is supposed to be a type alias declaration but is a " + SyntaxKind[typeAlias.kind];
            }

            for(const typeArgument of typeAlias.typeParameters || []) {
                objectInfo.typeArgumentNames.push(typeArgument.name.text);
            }
        }

        for(let [ key, value ] of type.symbol.members! as Map<string, Symbol>) {
            if(value.flags & SymbolFlags.Property) {
                const propertySignature = value.valueDeclaration as PropertySignature;
                if(propertySignature?.kind !== SyntaxKind.PropertySignature) {
                    throw "expected a property signature node";
                }

                if(value.flags & SymbolFlags.Optional) {
                    objectInfo.optionalMembers[key] = describeNode(propertySignature.type, innerContext);
                } else {
                    objectInfo.members[key] = describeNode(propertySignature.type, innerContext);
                }
            } else if(value.flags === SymbolFlags.TypeParameter) {
                /* Type parameter specification for interfaces. */
                if(value.declarations.length < 1) {
                    /* TODO: Verify that all declarations are equal and don't only take the first one! */
                    throw "type parameter expect at least only one declaration";
                }
                const declaration = value.declarations[0] as TypeParameterDeclaration;
                if(declaration.kind !== SyntaxKind.TypeParameter) {
                    throw "expected a type parameter";
                }

                objectInfo.typeArgumentNames.push(key);
            } else if(value.flags === SymbolFlags.Method) {
                objectInfo.members[key] = {
                    type: "method"
                };
            } else {
                throw "unknown how to handle object member of kind " + displayFlags(value.flags, SymbolFlags);
            }
        }

        for(const baseType of type.getBaseTypes() || []) {
            objectInfo.extends.push(describeType(baseType, ctx));
        }
    }

    if(objectInfo.typeArgumentNames.length === 0) {
        delete objectInfo.typeArgumentNames;
    }

    if(Object.keys(objectInfo.members).length === 0) {
        delete objectInfo.members;
    }

    if(Object.keys(objectInfo.optionalMembers).length === 0) {
        delete objectInfo.optionalMembers;
    }

    if(objectInfo.extends.length === 0) {
        delete objectInfo.extends;
    }

    return referenceId ? referenceResult : objectInfo;
}

TypeDescribeMap[TypeFlags.Union] = () => {
    throw "Unions should be handled via nodes";
};

TypeDescribeMap[TypeFlags.Intersection] = () => {
    throw "Intersections should be handled via nodes";
};

export const describeType = (type: Type, ctx: TypeDisplayContext): TType => {
    for(const key of Object.keys(TypeDescribeMap)) {
        const mask = parseInt(key);
        if(type.flags & mask) {
            let result = TypeDescribeMap[key];
            if(typeof result === "object") {
                return result;
            }

            return result(type, ctx);
        }
    }

    throw "unknown type " + displayFlags(type.flags, TypeFlags);
}
