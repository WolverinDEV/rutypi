/**
 * This module will be automatically added by the rutypi webpack plugin.
 * It contains all required extra type information.
 */
declare module "rutypi-datastore" {
    import {Type} from "rutypi-sharedlib/types";

    type TypeEntry = {
        status: "success",
        value: string | Type
    } | {
        status: "error",
        message: string
    };

    const data: {
        knownTypes: {
            [key: string]: TypeEntry
        }
    };

    export default data;
}