import {
    ArrayTypeNode, BigIntLiteral,
    InterfaceDeclaration, LiteralTypeNode,
    NamedTupleMember,
    Node,
    NumericLiteral,
    OptionalTypeNode,
    ParenthesizedTypeNode, PropertyName,
    PropertySignature,
    RestTypeNode,
    StringLiteral,
    SymbolFlags,
    SyntaxKind,
    TupleTypeNode,
    TypeAliasDeclaration,
    TypeChecker,
    TypeLiteralNode,
    TypeReferenceNode,
    UnionTypeNode
} from "typescript";
import {Type as TType, TypeTuple} from "../shared/types";
import {displayFlags, simplifyType} from "./utils";

type TypeDisplayContext = {
    typeChecker: TypeChecker,

    prefix: string,
    depth: number,

    references: {
        [key: string]: TType
    },
};

const assert = (expr: boolean, message: string) => {
    if(!expr) {
        throw message;
    }
};

const computePropertyName = (node: PropertyName) => {
    switch (node.kind) {
        case SyntaxKind.Identifier:
        case SyntaxKind.NumericLiteral:
        case SyntaxKind.PrivateIdentifier:
        case SyntaxKind.StringLiteral:
            return node.text;

        case SyntaxKind.ComputedPropertyName:
            throw "Computed property names not yet supported";

        default:
            throw `unknown property name kind ${SyntaxKind[(node as Node).kind]}`;
    }
};

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
        type: "intersection",
        types: node.types.map(node => describeNode(node, ctx))
    }
};

/* NullLiteral | BooleanLiteral | LiteralExpression | PrefixUnaryExpression */
NodeDescribeMap[SyntaxKind.ParenthesizedType] = (node: ParenthesizedTypeNode, ctx) => describeNode(node.type, ctx);
NodeDescribeMap[SyntaxKind.UndefinedKeyword] = { type: "undefined" };
NodeDescribeMap[SyntaxKind.NullKeyword] = { type: "null" };
NodeDescribeMap[SyntaxKind.AnyKeyword] = { type: "any" };
NodeDescribeMap[SyntaxKind.UnknownKeyword] = { type: "unknown" };
NodeDescribeMap[SyntaxKind.StringKeyword] = { type: "string" };
NodeDescribeMap[SyntaxKind.StringLiteral] = (node: StringLiteral) => ({ type: "string", value: node.text });
NodeDescribeMap[SyntaxKind.NumberKeyword] = { type: "number" };
NodeDescribeMap[SyntaxKind.NumericLiteral] = (node: NumericLiteral) => ({ type: "number", value: parseFloat(node.text) });
NodeDescribeMap[SyntaxKind.BigIntKeyword] = { type: "bigint" };
NodeDescribeMap[SyntaxKind.BigIntLiteral] = (node: BigIntLiteral) => ({ type: "bigint", value: node.text });
NodeDescribeMap[SyntaxKind.BooleanKeyword] = { type: "boolean" };
NodeDescribeMap[SyntaxKind.TrueKeyword] = { type: "boolean", value: true };
NodeDescribeMap[SyntaxKind.FalseKeyword] = { type: "boolean", value: false };
NodeDescribeMap[SyntaxKind.PrefixUnaryExpression] = () => {
    throw "prefix unary expressions are not supported";
};
NodeDescribeMap[SyntaxKind.RegularExpressionLiteral] = () => {
    throw "regular expressions are not supported";
};
NodeDescribeMap[SyntaxKind.LiteralType] = (node: LiteralTypeNode, ctx) => describeNode(node.literal, ctx);
NodeDescribeMap[SyntaxKind.TypeReference] = (node: TypeReferenceNode, ctx) => {
    const symbol = ctx.typeChecker.getSymbolAtLocation(node.typeName);

    if(symbol === undefined) {
        console.warn("Failed to lookup type reference for %s. Returning any type.", node.typeName.getText());
        return { type: "any" };
    }

    const symbolType = symbol.flags & SymbolFlags.Type;
    switch (symbolType) {
        case 0:
            throw "a type reference symbol should reference a type";

        case SymbolFlags.EnumMember:
            throw "unknown how to handle an enum member";

        case SymbolFlags.ConstEnum:
        case SymbolFlags.RegularEnum:
            /* TODO: Implement support? */
            throw "enums are not yet supported";

        case SymbolFlags.Class:
            throw "Classes can't be described.\nOnly primitive types, objects and interfaces can be described.";

        case SymbolFlags.Interface: {
            const typeReference: TType = {
                type: "type-reference",
                target: `I${symbol["id"]}_${symbol.name}`,
                typeArguments: node.typeArguments?.map(type => describeNode(type, ctx))
            };
            assert(symbol.declarations.length > 0, "expected at least one interface declaration");
            assert(typeof symbol.valueDeclaration === "undefined", "did not expect a valueDeclaration for a interface alias");

            if(typeReference.target in ctx.references) {
                return typeReference;
            }

            /* create a anonymous object which inherits all interfaces */
            const typeInfo: TType = {
                type: "object",
                extends: [],
            };

            for(const declaration of symbol.declarations) {
                const interfaceDeclaration = declaration as InterfaceDeclaration;
                assert(declaration.kind === SyntaxKind.InterfaceDeclaration, `expected a interface declaration but received ${SyntaxKind[declaration.kind]}`);
                assert(interfaceDeclaration.name.text === symbol.name, `miss matching symbol and interface declaration names (symbol: ${symbol.name}, interface: ${interfaceDeclaration.name.text})`);

                const declarationSymbol = ctx.typeChecker.getSymbolAtLocation(interfaceDeclaration.name);
                const typeReference: TType = {
                    type: "type-reference",
                    target: `I${declarationSymbol["id"]}_${declarationSymbol.name}`,
                };

                if(!(typeReference.target in ctx.references)) {
                    ctx.references[typeReference.target] = describeNode(declaration, ctx);
                }

                typeInfo.extends.push(typeReference);
            }

            if(typeInfo.extends.length === 1) {
                ctx.references[typeReference.target] = ctx.references[typeInfo.extends[0].target];
            } else {
                ctx.references[typeReference.target] = simplifyType(typeInfo);
            }
            return typeReference;
        }

        case SymbolFlags.TypeLiteral:
            /* should be handled directly within the SyntaxKind.TypeLiteral */
            throw "this seems to be a bug";

        case SymbolFlags.TypeParameter:
            return { type: "type-parameter-reference", target: symbol.getName() };

        case SymbolFlags.TypeAlias:
            assert(symbol.declarations.length === 1, "expected only one declaration for a type alias");
            assert(typeof symbol.valueDeclaration === "undefined", "did not expect a valueDeclaration for a type alias");
            assert(symbol.declarations[0].kind === SyntaxKind.TypeAliasDeclaration, `expected a type alias declaration but received ${SyntaxKind[symbol.declarations[0].kind]}`);

            const typeReference: TType = {
                type: "type-reference",
                target: `T${symbol["id"]}_${symbol.name}`,
                typeArguments: node.typeArguments?.map(type => describeNode(type, ctx))
            };

            if(typeReference.target in ctx.references) {
                return typeReference;
            }

            ctx.references[typeReference.target] = describeNode(symbol.declarations[0], ctx);
            return typeReference;

        case SymbolFlags.Type:
            /* btw, what is this? I only know TypeLiteral */
            throw "unknown how to handle a type within a type reference";

        default:
            throw "unhandled symbol kind (type) with flags (" + displayFlags(symbol.flags, SymbolFlags) + ")";
    }
};

/* This describes a "type X = ...".  */
NodeDescribeMap[SyntaxKind.TypeAliasDeclaration] = (type: TypeAliasDeclaration, ctx) => {
    const typeInfo = describeNode(type.type, ctx);
    if(typeInfo.type === "object") {
        /* TODO: We need a new system for generic parameter! */
        typeInfo.typeArgumentNames = type.typeParameters?.map(parameter => parameter.name.text);
    }
    return typeInfo;
};
const describeTypeLiteralOrInterface = (node: TypeLiteralNode | InterfaceDeclaration, ctx: TypeDisplayContext) => {
    const result: TType = {
        type: "object",

        members: {},
        optionalMembers: {},

        typeArgumentNames: [],
        extends: []
    };

    for(const member of node.members) {
        const name = computePropertyName(member.name);
        const memberObject = member.questionToken ? result.optionalMembers : result.members;

        switch (member.kind) {
            case SyntaxKind.SetAccessor:
            case SyntaxKind.GetAccessor:
            case SyntaxKind.ConstructSignature:
            case SyntaxKind.CallSignature:
                /* Can only be valid on interfaces. */
                throw `Interfaces which should be describable should only contain properties, index signatures or methods. ${SyntaxKind[member.kind]} can not be described.`;

            case SyntaxKind.MethodSignature:
                memberObject[name] = { type: "method" };
                break;

            case SyntaxKind.IndexSignature:
                /* TODO: This could be implemented */
                throw "index signature not yet supported";

            case SyntaxKind.PropertySignature:
                const propertySignature = member as PropertySignature;
                memberObject[name] = describeNode(propertySignature.type, ctx);
                break;
        }
    }

    return simplifyType(result);
};

NodeDescribeMap[SyntaxKind.TypeLiteral] = describeTypeLiteralOrInterface;
NodeDescribeMap[SyntaxKind.InterfaceDeclaration] = describeTypeLiteralOrInterface;
NodeDescribeMap[SyntaxKind.ArrayType] = (node: ArrayTypeNode, ctx) => ({
    type: "array",
    elementType: describeNode(node.elementType, ctx)
});
NodeDescribeMap[SyntaxKind.TupleType] = (node: TupleTypeNode, ctx) => {
    const result: TypeTuple = {
        type: "tuple",
        elements: [],
        optionalElements: []
    };

    const handleRestType = (elementType: TType) => {
        if(typeof result.dotdotdotElement !== "undefined") {
            throw "encountered two rest type definitons";
        }

        if(elementType.type === "array") {
            result.dotdotdotElement = elementType.elementType;
        } else {
            result.dotdotdotElement = elementType;
        }
    }

    /*
     * Optional types can only follow after elements.
     * Only optional types can follow. This keeps all elements in order.
     */
    for(const element of node.elements) {
        switch (element.kind) {
            case SyntaxKind.NamedTupleMember: {
                const namedTupleMember = element as NamedTupleMember;
                const elementType = describeNode(namedTupleMember.type, ctx);

                if(namedTupleMember.dotDotDotToken) {
                    handleRestType(elementType);
                } else if(namedTupleMember.questionToken) {
                    result.optionalElements.push(elementType);
                } else {
                    result.elements.push(elementType);
                }
                break;
            }

            case SyntaxKind.OptionalType:
                const optionalType = element as OptionalTypeNode;
                result.optionalElements.push(describeNode(optionalType.type, ctx));
                break;

            case SyntaxKind.RestType: {
                const restType = element as RestTypeNode;
                const elementType = describeNode(restType.type, ctx);
                handleRestType(elementType);
                break;
            }

            default:
                result.elements.push(describeNode(element, ctx));
                break;
        }
    }

    if(result.elements.length === 0) {
        delete result.elements;
    }
    if(result.optionalElements.length === 0) {
        delete result.optionalElements;
    }

    return result;
};
NodeDescribeMap[SyntaxKind.NamedTupleMember] = () => {
    /* should be handled directly within the tuple */
    throw "this seems to be a bug";
};
NodeDescribeMap[SyntaxKind.OptionalType] = () => {
    /* should be handled directly within the tuple */
    throw "this seems to be a bug";
};
NodeDescribeMap[SyntaxKind.RestType] = () => {
    /* should be handled directly within the tuple */
    throw "this seems to be a bug";
};

export const describeNode = (node: Node, ctx: TypeDisplayContext): TType => {
    let result = NodeDescribeMap[node.kind];
    if(result === undefined) {
        throw "unknown how to describe node " + SyntaxKind[node.kind];
    } else if(typeof result === "object") {
        return result;
    } else {
        return result(node, ctx);
    }
}