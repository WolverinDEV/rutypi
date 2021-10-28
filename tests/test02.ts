/*
 * Test for interfaces passed as argument.
 */
import { validateType } from "rutypi";

interface A {
    color: string
}

validateType<A>(null);
validateType<{
    foo: {
        bar: A
    }
}>(null);