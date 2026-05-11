import {JsObject, Mutable} from './types';
import {isBlank} from './types-tester';

export function asString(obj: unknown): obj is string {
    return typeof obj === 'string';
}

export function asBoolean(obj: unknown): obj is boolean {
    return typeof obj === 'boolean';
}

/**
 * Test that value is a function
 * @param value to test 
 * @returns true -> value is a function.
 */
export function asFunction(obj: unknown): obj is (...args: unknown[]) => unknown {
    return !isBlank(obj) && typeof obj === 'function';
}


export function asNumber(obj: unknown): obj is number {
    return typeof obj === 'number';
}

export function asMutable<T>(obj: T): Mutable<T> {
    return { value: obj};
}

export function clone<T = unknown>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
}

export function isArray(obj: unknown): boolean {
    return Array.isArray(obj);
}

export function asArray<T>(obj: unknown): obj is T[] {
    return Array.isArray(obj) && obj.length > 0;
}

/**
 * Helper function to ensure value is an array even undefined.
 * @param val A value that may be a singleton or an array.
 * @returns enforce an Array type.
 */
export function toArray<T>(val: T | T[] | undefined): T[] {
    return Array.isArray(val) 
        ? val
        : val === undefined
            ? []
            : [val];
}

export function asDate(obj: unknown): obj is Date {
    return obj instanceof Date && !isNaN(obj.valueOf());
}

export function asJsObject(o: unknown): o is JsObject {
    return o !== null && (typeof o === 'function' || typeof o === 'object');
}


export function isBoolean(obj: unknown): boolean {
    return typeof obj === 'boolean';
}

export function isNumber(obj: unknown): boolean {
    return typeof obj === 'number';
}

export function isString(obj: unknown): obj is string {
    return typeof obj === 'string';
}

export function isScalar(obj: unknown): boolean {
    return [ 'string', 'number', 'boolean' ].includes(typeof obj);


export function isFunction(obj: unknown): obj is (...args: unknown[]) => unknown {
    return !isBlank(obj) && typeof obj === 'function';
}




export function isPromise(obj: unknown): boolean {
    // allow any Promise/A+ compliant thenable.
    // It's up to the caller to ensure that obj.then conforms to the spec
    return obj !== null && obj !== undefined && isFunction((obj as { then?: unknown }).then);
}

export function isDate(obj: unknown): boolean {
    return obj instanceof Date && !isNaN(obj.valueOf());
}


/**
 * Ensure value as start as starting characters.
 * @param value to ensure
 * @param start statement
 * @returns 'value' having 'start' as starter.
 */
export function ensureStartsWith(value: string, start: string): string {
    return value.startsWith(start) ? value : start + value;
}
