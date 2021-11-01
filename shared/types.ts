export type TypeRegistry = {
    definitions: {
        [key: string]: Type
    },
    definitionReferences: {
        [key: string]: string[]
    }
}

export type Type = TypeObject | TypeReference | TypeParameterReference | TypeIntersection | TypeUnion | {
    type: "any" | "unknown" | "undefined" | "null"
} | TypeNumber | TypeBigInt | TypeString | TypeBoolean | TypeMethod | TypeArray | TypeTuple;

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

export type TypeBigInt = {
    type: "bigint",
    value?: string,
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
    extends?: TypeReference[]
};

export type TypeParameterReference = {
    type: "type-parameter-reference",
    target: string,
};

export type TypeReference = {
    type: "type-reference",
    target: string,
    typeArguments?: Type[],
};

export type TypeArray = {
    type: "array",
    elementType: Type,
};

export type TypeTuple = {
    type: "tuple",
    elements?: Type[],
    optionalElements?: Type[],
    dotdotdotElement?: Type,
};

export type TypeInvalid = {
    type: "invalid",
    reason: string
};