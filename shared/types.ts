export type TypeRegistry = {
    definitions: {
        [key: string]: Type
    },
    definitionReferences: {
        [key: string]: string[]
    }
}

export type Type = TypeObject | TypeReference | TypeIntersection | TypeUnion | {
    type: "any" | "unknown" | "undefined" | "null"
} | TypeNumber | TypeString | TypeBoolean | TypeMethod | TypeArray;

export type TypeUnion = {
    type: "union",
    types: Type[]
};

export type TypeIntersection = {
    type: "intersection",
    types: Type[]
};

export type TypeNumber = {
    type: "number",
    value?: number,
};

export type TypeString = {
    type: "string",
    value?: string,
};

export type TypeBoolean = {
    type: "boolean",
    value?: boolean
};

export type TypeMethod = {
    type: "method",
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

export type TypeArray = {
    type: "array",
    elementType: Type,
};

export type TypeInvalid = {
    type: "invalid",
    reason: string
};