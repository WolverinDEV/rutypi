export type TypeRegistry = {
    definitions: {
        [key: string]: Type
    },
    definitionReferences: {
        [key: string]: string[]
    }
}

export type Type = TypeObject | TypeReference | {
    type: "union",
    types: Type[]
} | {
    type: "intersection",
    types: Type[]
} | {
    type: "any" | "unknown" | "undefined" | "null" | "void"
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
};

export type TypeObject = {
    type: "object",
    typeArgumentNames?: string[],
    members?: {
        [key: string]: Type
    },
    optionalMembers?: {
        [key: string]: Type
    },
    extends?: Type[]
};

export type TypeReference = {
    type: "object-reference" | "type-reference",
    target: string,
    typeArguments: Type[],
};

export type TypeInvalid = {
    type: "invalid",
    reason: string
};