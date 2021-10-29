/**
 * This module will be automatically added by the rutypi webpack plugin.
 * It contains all required extra type information.
 */
declare module "rutypi-datastore" {
    import { Type } from "rutypi";

    type TypeEntry = {
        status: "success",
        value: Type
    } | {
        status: "error",
        message: string
    };

    const data: {
        knownTypes: {
            [key: string]: Type
        }
    };

    export default data;
}
