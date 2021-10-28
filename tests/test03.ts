/*
 * Test for intersections passed as argument.
 */
import { validateType } from "rutypi";

interface A {
    color: string,
    width: number,
}

interface B {
    width: number
}

validateType<A & B>(null);
validateType<A & { color: string }>(null);