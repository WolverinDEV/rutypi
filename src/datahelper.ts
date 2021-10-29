import {Type, TypeReference} from "../shared/types";
import datastore from "rutypi-datastore";

export function lookupReference(reference: TypeReference | string): Type | undefined {
    const refName = typeof reference === "object" ? reference.target : reference;
    const typeDecl = datastore.knownTypes[refName];
    return typeDecl;

    /*
    { status: "error", message: "not found" }X
    if(typeDecl.status === "success") {
        return typeDecl.value;
    } else {
        return undefined;
    }
     */
}