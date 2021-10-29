export declare type TypeRegistry = {
    definitions: {
        [key: string]: Type;
    };
    definitionReferences: {
        [key: string]: string[];
    };
};
export declare type Type = TypeObject | TypeReference | {
    type: "union";
    types: Type[];
} | {
    type: "intersection";
    types: Type[];
} | {
    type: "any" | "unknown" | "undefined" | "null" | "void";
} | {
    type: "number";
    value?: number;
} | {
    type: "string";
    value?: string;
} | {
    type: "boolean";
    value?: boolean;
} | {
    type: "method";
};
export declare type TypeObject = {
    type: "object";
    typeArgumentNames?: string[];
    members?: {
        [key: string]: Type;
    };
    optionalMembers?: {
        [key: string]: Type;
    };
    extends?: Type[];
};
export declare type TypeReference = {
    type: "object-reference" | "type-reference";
    target: string;
    typeArguments: Type[];
};
export declare type TypeInvalid = {
    type: "invalid";
    reason: string;
};
