export type TypeRegistry = {
    definitions: {
        [key: string]: Type
    },
    definitionReferences: {
        [key: string]: string[]
    }
}

export type Type = {
    type: "object",
    typeArgumentNames: string[],
    members: {
        [key: string]: Type
    },
    extends: Type[]
} | {
    type: "object-reference" | "type-reference",
    target: string,
    typeArguments: Type[],
} | {
    type: "union",
    types: Type[]
} | {
    type: "intersection",
    types: Type[]
} | {
    type: "any" | "unknown" | "void"
} | {
    /* TODO: Add support for bigint as well */
    type: "number",
    value?: number,
} | {
    type: "string",
    value?: string,
} | {
    type: "boolean",
    value?: boolean
} | {
    type: "method"
}