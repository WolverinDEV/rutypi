import {Type} from "../shared/types";

export const displayFlags = (flag: number, flags: object) => {
    const activeFlags = [];
    for(const key of Object.keys(flags)) {
        const keyNumeric = parseInt(key);
        if(isNaN(keyNumeric) || keyNumeric === 0) {
            continue;
        }

        if((flag & keyNumeric) === keyNumeric) {
            activeFlags.push(flags[keyNumeric]);
        }
    }
    return activeFlags.join(", ") || "no flags";
}

export const simplifyType = <T extends Type>(type: T): T => {
    switch (type.type) {
        case "object":
            if(type.typeArgumentNames?.length === 0) {
                delete type.typeArgumentNames;
            }

            if(Object.keys(type?.members || {}).length === 0) {
                delete type.members;
            }

            if(Object.keys(type?.optionalMembers || {}).length === 0) {
                delete type.optionalMembers;
            }

            if(type.extends?.length === 0) {
                delete type.extends;
            }

            break;

        case "type-reference":
            if(typeof type.typeArguments === "undefined" || type.typeArguments.length === 0) {
                delete type.typeArguments;
            }
            break;
    }

    return type;
}