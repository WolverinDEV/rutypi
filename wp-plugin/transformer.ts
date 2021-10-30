import * as ts from "typescript";
import {
    Block,
    FunctionDeclaration,
    Identifier,
    ImportDeclaration,
    NamedImports,
    NamespaceImport,
    Node,
    PropertyAccessExpression,
    SourceFile,
    StringLiteral,
    SyntaxKind,
    TransformationContext,
} from "typescript";
import {Type, TypeRegistry} from "../shared/types";
import * as _ from "lodash";
import {describeNode} from "./describer";

type VisitContext = {
    program: ts.Program,
    registry: {
        [key: string]: Type
    },
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
    if(typeof node.importClause === "undefined") {
        /* just a file import without any imports. */
        return node;
    }

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

            // console.info("Found namespace import of %s as %s", importModule, namespaceImport.name.text);
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
                //console.warn("Failed to map %s to an import.", identifier.text);
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

        case SyntaxKind.ElementAccessExpression:
            /* TODO: This could be a reference to our import */
            return node;

        case SyntaxKind.SuperKeyword:
        case SyntaxKind.ThisKeyword:
            /* these calls can never be a call to an imported function */
            return node;

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
        case "typeInfo":
            if(node.typeArguments.length !== 1) {
                report(node, "invalid type argument length");
                return node;
            }

            let typeData;
            try {
                typeData = describeNode(node.typeArguments[0], {
                    typeChecker: ctx.program.getTypeChecker(),
                    references: ctx.registry,

                    depth: 0,
                    prefix: "",
                });
            } catch (error) {
                console.error("ERROR: %s - %o", error);
                typeData = {
                    status: "invalid",
                    message: error.toString()
                }
            }

            const { factory } = ctx.transformCtx;
            return factory.updateCallExpression(
                node,
                factory.createPropertyAccessExpression(
                    node.expression,
                    "__original"
                ),
                node.typeArguments,
                [
                    factory.createIdentifier(JSON.stringify(typeData)),
                    ...node.arguments
                ]
            );

        case "lookupReference":
            return node;

        default:
            console.warn("Found import to %s but we don't know how to handle this.", functionName);
            return node;
    }
};

const cloneContext = (context: VisitContext): VisitContext => ({
    ...context,

    declaredVariables: _.clone(context.declaredVariables),
    declaredFunctions: _.clone(context.declaredFunctions),

    imports: _.clone(context.imports),
    importAlias: _.clone(context.importAlias),
    importNamespace: _.clone(context.importNamespace),
})

const visit = <T extends Node>(node: T, context: VisitContext) => {
    let newNode: Node = node;

    if(context.printChildrenTree) {
        console.info("%s %s", context.printPrefix, SyntaxKind[node.kind]);
    }

    if(typeof nodeTransformer[node.kind] === "function") {
        newNode = nodeTransformer[node.kind](node, context);
    }

    if(newNode === node) {
        let childContext = cloneContext(context);
        childContext.depth += 1;
        childContext.printPrefix += "  ";

        newNode = ts.visitEachChild(node, node => visit(node, childContext), context.transformCtx);
    }

    return newNode || [];
}

const createTransformer = (refProgram: { current: ts.Program }, registry: TypeRegistry) => (ctx: TransformationContext) => {
    return (node: SourceFile) => {
        console.error("Visit: %s", node.fileName);
        const initialContext: VisitContext = {
            program: refProgram.current,
            registry: {},

            transformCtx: ctx,
            depth: 0,

            printPrefix: "",
            printChildrenTree: false,

            declaredVariables: {},
            declaredFunctions: {},

            imports: {},
            importAlias: {},
            importNamespace: {}
        };

        /* This actually triggers the TypeChecker to build up his type information */
        //{
        //    const typeChecker = program["getDiagnosticsProducingTypeChecker"]() as TypeChecker;
        //    const diagnostics = typeChecker["getDiagnostics"](node, undefined) as ts.Diagnostic[];
        //    console.error("Dia: %o", diagnostics.map(entry => typeof entry.messageText === "string" ? entry.messageText : "chain"));
        //    console.error("Type count: %d", program.getTypeCount());
        //}

        for(const typeName of Object.keys(registry.definitionReferences)) {
            const references = registry.definitionReferences[typeName];
            const index = references.indexOf(node.fileName);
            if(index === -1) {
                continue;
            }

            references.splice(index, 1);
            if(references.length === 0) {
                delete registry.definitionReferences[typeName];
                delete registry.definitions[typeName];
            }
        }

        const result = visit(node, initialContext) as SourceFile;
        for(const typeName of Object.keys(initialContext.registry)) {
            registry.definitions[typeName] = initialContext.registry[typeName];
            const references = registry.definitionReferences[typeName] || (registry.definitionReferences[typeName] = []);
            references.push(node.fileName);
        }

        return result;
    }
}
export default createTransformer;
