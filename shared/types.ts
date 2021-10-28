export type TypeRegistry = {
    [key: string]: Type
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