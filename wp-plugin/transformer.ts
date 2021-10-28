import {
    Block,
    FunctionDeclaration,
    Identifier,
    ImportDeclaration,
    IntersectionType,
    NamedImports,
    NamespaceImport,
    Node,
    NumberLiteralType,
    ObjectFlags,
    ObjectType,
    PropertyAccessExpression,
    PropertySignature,
    SourceFile,
    StringLiteral,
    StringLiteralType,
    Symbol,
    SymbolFlags,
    SyntaxKind,
    TransformationContext,
    Type,
    TypeAliasDeclaration,
    TypeChecker,
    TypeFlags,
    TypeParameter,
    TypeParameterDeclaration,
    TypeReference,
    UnionType
} from "typescript";
import { Type as TType } from "rutypi-sharedlib/types";
import * as _ from "lodash";
import * as ts from "typescript";

type VisitContext = {
    program: ts.Program,
    transformCtx: TransformationContext,

    depth: number,

    printPrefix: string,
    printChildrenTree: boolean,

    imports: { [key: string]: string },
    importNamespace: { [key: string]: string },
    importAlias: { [key: string]: string },

    declaredVariables: { [key: string]: Node },
    declaredFunctions: { [key: string]: Node },
};

const getSourceLocation = (node: ts.Node) => {
    const sf = node.getSourceFile();
    let { line, character } = sf ? sf.getLineAndCharacterOfPosition(node.getStart()) : {line: -1, character: -1};
    return `${(sf || {fileName: "unknown"}).fileName} (${line + 1},${character + 1})`;
};

function report(node: ts.Node, message: string) {
    console.log(`${getSourceLocation(node)}: ${message}`);
}

const nodeTransformer: {
    [key in SyntaxKind]?: (node: Node, stack: VisitContext) => Node | undefined;
} = {};

nodeTransformer[SyntaxKind.Block] = (node: Block, ctx) => {
    ts.forEachChild(node, entry => {
        switch (entry.kind) {
            case SyntaxKind.FunctionDeclaration:
                /* Function declarations can be at the end of a block and still be accessible. */
                const functionDeclaration = entry as FunctionDeclaration;
                ctx.declaredFunctions[functionDeclaration.name.text] = functionDeclaration;
                break;

            /* TODO: var abc = ...; statements! These are equal to functions! (Note: let doesn't behave like this!) */
            default:
                return;
        }
    });
    return node;
}

nodeTransformer[SyntaxKind.ImportDeclaration] = (node: ImportDeclaration, ctx) => {
    const importClause = node.importClause!;
    const importModule = (node.moduleSpecifier as StringLiteral).text;

    switch (importClause.namedBindings?.kind) {
        case SyntaxKind.NamedImports:
            const namedImports: NamedImports = importClause.namedBindings!;
            for(const imp of namedImports.elements) {
                ctx.imports[imp.name.text] = importModule;

                if(imp.propertyName) {
                    // console.info("Found import %s of %s with alias %s", imp.propertyName.text, importModule, imp.name.text);
                    ctx.importAlias[imp.name.text] = imp.propertyName.text;
                } else {
                    // console.info("Found import %s of %s", imp.name.escapedText, importModule);
                }
            }
            break;

        case SyntaxKind.NamespaceImport:
            const namespaceImport: NamespaceImport = importClause.namedBindings;
            ctx.importNamespace[namespaceImport.name.text] = importModule;

            console.info("Found namespace import of %s as %s", importModule, namespaceImport.name.text);
            break;

        default:
            break;
    }

    return node;
}

nodeTransformer[SyntaxKind.CallExpression] = (node: ts.CallExpression, ctx) => {
    let moduleName: string, functionName: string;
    switch (node.expression.kind) {
        case SyntaxKind.Identifier:
            const identifier = node.expression as Identifier;
            if(identifier.text in ctx.declaredFunctions || identifier.text in ctx.declaredVariables) {
                /* Some function/variable declared by the user */
                return node;
            }

            functionName = ctx.importAlias[identifier.text] || identifier.text;
            moduleName = ctx.imports[identifier.text];

            if(moduleName === undefined) {
                console.warn("Failed to map %s to an import.", identifier.text);
                return node;
            }
            break;

        case SyntaxKind.PropertyAccessExpression:
            const propertyAccessExpression = node.expression as PropertyAccessExpression;
            if(propertyAccessExpression.expression.kind !== SyntaxKind.Identifier) {
                /*
                 * We can only call imports directly or via a namespace.
                 * Other kinds of indirect tracking is not yet supported.
                 */
                return node;
            }

            const variableName = propertyAccessExpression.expression.getText();
            moduleName = ctx.importNamespace[variableName];
            functionName = propertyAccessExpression.name.getText();
            if(moduleName === undefined) {
                /* The variable might be declared somewhere else and we don't know about. */
                //console.warn("Failed to map variable %s to a namespace import.", variableName);
                return node;
            }
            break;

        default:
            console.warn("Unknown how to handle call expression for %s: %s", SyntaxKind[node.expression.kind], node.expression.getText());
            return node;
    }

    //console.info("Found import function call to %s in %s", functionName, moduleName);
    if(moduleName !== "rutypi") {
        /* Not the module we're hoping for */
        return node;
    }

    switch (functionName) {
        case "validateType":
            if(node.typeArguments.length !== 1) {
                report(node, "invalid type argument length");
                return node;
            }

            const typeChecker = ctx.program.getTypeChecker();
            const typeNode = node.typeArguments[0];

            console.error("Type node: %s", SyntaxKind[typeNode.kind])
            const type = typeChecker.getTypeFromTypeNode(typeNode);
            const references = {};
            let typeData;
            try {
                typeData = displayType(type, {
                    typeChecker,
                    references,

                    depth: 0,
                    prefix: "",
                });
            } catch (error) {
                console.error("ERROR: %o", error);
                typeData = {
                    status: "invalid",
                    message: error.toString()
                }
            }
            console.error("Result: %o", typeData);

            /* TODO: Only use a unique identifier and register the actual result somewhere elsewhere as well */
            const { factory } = ctx.transformCtx;
            return factory.updateCallExpression(
                node,
                factory.createPropertyAccessExpression(
                    node.expression,
                    "__original"
                ),
                node.typeArguments,
                [factory.createStringLiteral(JSON.stringify(typeData)), ...node.arguments]
            );

        default:
            console.warn("Found import to %s but we don't know how to handle this.", functionName);
            return node;
    }
};

type TypeDisplayContext = {
    typeChecker: TypeChecker,

    prefix: string,
    depth: number,

    references: {
        [key: string]: TType
    },
}

const displayFlags = (flag: number, flags: object) => {
    const activeFlags = [];
    for(const key of Object.keys(flags)) {
        const keyNumeric = parseInt(key);
        if(isNaN(keyNumeric)) {
            continue;
        }

        if((flag & keyNumeric) === keyNumeric) {
            activeFlags.push(flags[keyNumeric]);
        }
    }
    return activeFlags.join(", ") || "no flags";
}

const TypeDisplayMap: {
    [K in TypeFlags]?: TType | ((type: Type, ctx: TypeDisplayContext) => TType)
} = {};
TypeDisplayMap[TypeFlags.Any] = { type: "any" };
TypeDisplayMap[TypeFlags.Unknown] = { type: "unknown" };
TypeDisplayMap[TypeFlags.Void] = { type: "void" };
TypeDisplayMap[TypeFlags.String] = { type: "string" };
TypeDisplayMap[TypeFlags.StringLiteral] = (type: StringLiteralType) => ({ type: "string", value: type.value });
TypeDisplayMap[TypeFlags.Number] = { type: "number" };
TypeDisplayMap[TypeFlags.NumberLiteral] = (type: NumberLiteralType) => ({ type: "number", value: type.value });
TypeDisplayMap[TypeFlags.Boolean] = { type: "boolean" };
TypeDisplayMap[TypeFlags.BooleanLiteral] = (type: object) => ({ type: "boolean", value: type["intrinsicName"] === "true" });
TypeDisplayMap[TypeFlags.TypeParameter] = (type: TypeParameter) => ({ type: "type-reference", target: type.symbol.name, typeArguments: [] });
TypeDisplayMap[TypeFlags.Object] = (type: ObjectType, ctx) => {
    let typeArguments = type.aliasTypeArguments?.map(type => displayType(type, ctx));
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
        let result = displayType(typeReference.target, ctx);
        if(result.type !== "object-reference") {
            /* a reference should be pointing to some kind of object which will return a reference. */
            throw "this seems to be a bug in the compiler";
        }

        return {
            type: "object-reference",
            target: result.target,
            typeArguments: typeReference.typeArguments?.map(type => displayType(type, ctx)) || []
        };
    } else {
        throw "unknown object flags " + displayFlags(type.objectFlags, ObjectFlags);
    }

    let objectInfo: TType = {
        type: "object",
        extends: [],
        members: {},
        typeArgumentNames: []
    };

    referenceResult.target = referenceId;
    if(referenceId in ctx.references) {
        return referenceResult;
    } else {
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
            if(value.flags === SymbolFlags.Property) {
                const propertySignature = value.valueDeclaration as PropertySignature;
                if(propertySignature?.kind !== SyntaxKind.PropertySignature) {
                    throw "expected a property signature node";
                }

                const type = ctx.typeChecker.getTypeFromTypeNode(propertySignature.type);
                objectInfo.members[key] = displayType(type, innerContext);
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
            objectInfo.extends.push(displayType(baseType, ctx));
        }
    }

    return referenceResult;
}

TypeDisplayMap[TypeFlags.Union] = (type: UnionType, ctx) => ({
    type: "union",
    types: type.types.map(type => displayType(type, ctx))
})

TypeDisplayMap[TypeFlags.Intersection] = (type: IntersectionType, ctx) => ({
    type: "intersection",
    types: type.types.map(type => displayType(type, ctx))
})

const displayType = (type: Type, ctx: TypeDisplayContext): TType => {
    for(const key of Object.keys(TypeDisplayMap)) {
        const mask = parseInt(key);
        if(type.flags & mask) {
            let result = TypeDisplayMap[key];
            if(typeof result === "object") {
                return result;
            }

            return result(type, ctx);
        }
    }

    throw "unknown type " + displayFlags(type.flags, TypeFlags);
}

const visit = <T extends Node>(node: T, context: VisitContext) => {
    let newNode: Node = node;

    if(context.printChildrenTree) {
        console.info("%s %s", context.printPrefix, SyntaxKind[node.kind]);
    }

    if(typeof nodeTransformer[node.kind] === "function") {
        newNode = nodeTransformer[node.kind](node, context);
    }

    if(newNode === node) {
        let childContext = _.cloneDeep(context);
        childContext.depth += 1;
        childContext.printPrefix += "  ";

        newNode = ts.visitEachChild(node, node => visit(node, childContext), context.transformCtx);
    }

    return newNode || [];
}

const createTransformer = (program: ts.Program) => (ctx: TransformationContext) => {
    return (node: SourceFile) => {
        console.error("Visit: %s", node.fileName);
        const initialContext: VisitContext = {
            program: program,
            transformCtx: ctx,
            depth: 0,

            printPrefix: "",
            printChildrenTree: false,

            declaredVariables: {},
            declaredFunctions: {},

            imports: {},
            importAlias: {},
            importNamespace: {
                "console": "sys.console",
                "window": "sys.window",
            }
        };

        return visit(node, initialContext) as SourceFile;
    }
}
export default createTransformer;
