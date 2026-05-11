import {JoeLogger} from './loggers';
import {isBlank, isDataAssigned, isEmptyObj, isEmptyString, isStringAssigned} from './types-tester';
import {JsonObj, Mutable, ValidationState} from './types';
import { PATH_LOCAL, PATH_NEXT, PATH_ROOT } from './constants';
import {signal, Signal, WritableSignal} from '@angular/core';
import {asMutable} from './types-helper';


export type AsyncValidationRule<T> = (v: T) => Promise<JsonObj | undefined>;
export type ElementErrorResults<T> = {[P in keyof T]?: JsonObj | undefined} & {
    _?: JsonObj | undefined;
} & JsonObj;
export type ValidationFunc<T> = (v: T) => JsonObj | undefined;
export type ValidationRule<T> = {
    prerequisits?: string | string[];
    rule: ValidationFunc<T>;
};

export class ElementValidationState<T> implements ValidationState {
    private _errorsS: WritableSignal<Mutable<ElementErrorResults<T>>>;
    public errors: ElementErrorResults<T>;
    public get errorsS(): Signal<Mutable<ElementErrorResults<T>>> {
        return this._errorsS;
    }
    public initialized = false;

    constructor(source?: ElementErrorResults<T>) {
        this.errors = source ?? {};
        this._errorsS = signal<Mutable<ElementErrorResults<T>>>(asMutable(this.errors)); 
    }

    public checking(error: JsonObj | undefined) {
        return error === ASYNCRULE_RUNNING_ERROR;
    }

    public clear(scope: 'all' | '_' | 'items' = 'all'): void {
        const errors = this.errors as any;
        if (this.withError()) {
            const props = [];
            switch (scope) {
                case 'all': props.push(...Object.keys(errors)); break;
                case '_': props.push('_'); break;
                case 'items': props.push(...Object.keys(errors).filter((p) => p != '_' )); break;
            }
            for (const prop of props) {
                delete errors[prop];
            }
            if( scope == 'all') {
                this.initialized = false;
            }
            
            this._errorsS.set(asMutable(this.errors));
        }
    }

    public debug(context?: string) {
        if (context === undefined) {
            if (this.withError()) {
                JoeLogger.group('MODEL VALIDATION: KO');
                JoeLogger.info(this.errors);
                JoeLogger.endgroup();
            } else {
                JoeLogger.debug('MODEL VALIDATION: OK');
            }
        } else {
            if (this.errors[context]) {
                JoeLogger.group('VALIDATION ' + context + ' : KO');
                JoeLogger.info(this.errors[context] as object);
                JoeLogger.endgroup();
            } else {
                JoeLogger.debug('VALIDATION ' + context + ' : OK');
            }
        }
    }

    public isValid(property?: keyof T): boolean {
        return isBlank(property)
            ? !this.withError()
            : !isDataAssigned(this.errors[property!]);
    }

    public matchPrerequisits(prerequisites?: string[]): boolean {
        if (!this.initialized) {
            return false;
        }
        if (prerequisites !== undefined) {
            if( Array.isArray(prerequisites)) {
                for (const prerequisit of prerequisites) {
                    if( isBlank(prerequisit)) continue;
    
                    var propertyParts = prerequisit.split(PATH_NEXT).filter((p) => p != PATH_LOCAL && p != PATH_ROOT );
                    const readPath = (obj: JsonObj, prop: string) => (obj ?? {})[prop] as JsonObj | undefined;
                    if (this.withError() && propertyParts.length > 0 ) {
                        var obj = this.errors as JsonObj | undefined;
                        for (const part of propertyParts) {
                            obj = readPath(obj!, part);
                            if (!isDataAssigned(obj)) {
                                return true;
                            }
                        }
                        if (isDataAssigned(obj)) {
                            return false;
                        }
                    }
                }
            } else if( isStringAssigned(prerequisites)) {
                const prerequisits = prerequisites as string;
                const propertyParts = prerequisits.split(PATH_NEXT).filter((p) => p != PATH_LOCAL && p != PATH_ROOT );
                const readPath = (obj: JsonObj, prop: string) => (obj ?? {})[prop] as JsonObj | undefined;
                if (this.withError() && propertyParts.length > 0 ) {
                    let obj = this.errors as JsonObj | undefined;
                    for (const part of propertyParts) {
                        obj = readPath(obj, part);
                        if (!isDataAssigned(obj)) {
                            return true;
                        }
                    }
                    if (isDataAssigned(obj)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    public matchesRequiredConstraint(
        propertyName: keyof T | '_',
        required: boolean,
        value: any
    ): boolean {
        const unassigned = isBlank(value) || isEmptyString(value);
        const errors = this.errors as any;
        if (required && unassigned) {
            errors[propertyName] = REQUIRED_ERROR;
        } else if (unassigned || this.errors[propertyName] === REQUIRED_ERROR) {
            delete errors[propertyName];
        }

        return !unassigned;
    }

    public setItemErrors(propName: string, error: JsonObj | undefined): void {
        const withError = isDataAssigned(error);
        if (withError) {
            (this.errors as JsonObj)[propName] = error;
            this._errorsS.set(asMutable(this.errors));
        } else if ((this.errors as JsonObj)[propName]) {
            delete (this.errors as JsonObj)[propName];
            this._errorsS.set(asMutable(this.errors));
        }
    }

    public result(): ElementErrorResults<T> | undefined {
        return this.withError() ? this.errors : undefined;
    }

    public unassigned(): boolean {
        return (
            isEmptyObj(this.errors) ||
            (Object.values(this.errors).some((value) => value === REQUIRED_ERROR))
        );
    }


    public withError(): boolean {
        return isDataAssigned(this.errors);
    }
}

/**
 * ValidationState implementation for an Array
 * * Array specific constraint as min/mas Items count are set on '_' property name.
 * 
 * Invalid child item will be set:
 * * on a position index '[x]' if child is scalar or has no index,
 * * on **JOE** Json path key index '(Xxx)' when the child has an index.
 */
export class ListValidationState implements ValidationState {
    public errors: JsonObj;
    private _errorsS: WritableSignal<Mutable<JsonObj>>;
    public get errorsS(): Signal<Mutable<JsonObj>> {
        return this._errorsS;
    }
    public initialized = false;

    constructor() {
        this.errors = {};
        this._errorsS = signal<Mutable<JsonObj>>(asMutable(this.errors)); 
    }

    public static FROM(source: JsonObj): ListValidationState {
        const result = new ListValidationState();
        if (source) {
            result.errors = source;
        }
        return result;
    }

    public clear(scope: 'all' | '_' | 'items' = 'all'): void {
        const errors = this.errors as any;
        if (this.withError()) {
            const props = [];
            switch (scope) {
                case 'all': props.push(...Object.keys(errors)); break;
                case '_': props.push('_'); break;
                case 'items': props.push(...Object.keys(errors).filter((p) => p != '_' )); break;
            }
            for (const prop of props) {
                delete errors[prop];
            }
            if( scope == 'all') {
                this.initialized = false;
            }
            
            this._errorsS.set(asMutable(this.errors));
        }
    }

    public debug(context: string, isRoot: boolean) {
        const scope = context || '*';
        if (scope === '*') {
            if (this.withError()) {
                JoeLogger.group('MODEL VALIDATION KO');
                JoeLogger.info(this.errors);
                JoeLogger.endgroup();
            } else {
                JoeLogger.debug('MODEL VALIDATION OK');
            }
        } else {
            if (this.errors[context]) {
                JoeLogger.group('PROPERTY VALIDATION: ' + context + ' : KO');
                JoeLogger.info(this.errors[context] as object);
                JoeLogger.endgroup();
            } else {
                JoeLogger.debug('PROPERTY VALIDATION: ' + context + ' : OK');
            }
        }
    }

    public getItemState(propName: string): ValidationHandler {
        return new ValidationHandler(this.errors[propName] as JsonObj | undefined);
    }

    public isValid(property?: string): boolean {
        return isBlank(property)
            ? !this.withError()
            : !isDataAssigned(this.errors[property!]);
    }

      public matchPrerequisits(prerequisites?: string[]): boolean {
        if (!this.initialized) {
            return false;
        }
        if (prerequisites !== undefined) {
            if( Array.isArray(prerequisites)) {
                for (const prerequisit of prerequisites) {
                    if( isBlank(prerequisit)) continue;
    
                    var propertyParts = prerequisit.split(PATH_NEXT).filter((p) => p != PATH_LOCAL && p != PATH_ROOT );
                    const readPath = (obj: JsonObj, prop: string) => (obj ?? {})[prop] as JsonObj | undefined;
                    if (this.withError() && propertyParts.length > 0 ) {
                        var obj = this.errors as JsonObj | undefined;
                        for (const part of propertyParts) {
                            obj = readPath(obj!, part);
                            if (!isDataAssigned(obj)) {
                                return true;
                            }
                        }
                        if (isDataAssigned(obj)) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    public merge(childrenErrors: JsonObj): this {
        if (isDataAssigned(childrenErrors)) {
            const errors = this.errors as any;
            const selfExtra = childrenErrors['_'] as any;
            if (isDataAssigned(selfExtra)) {
                this.errors['_'] = this.withError() ? {...errors._, ...selfExtra} : selfExtra;
                delete childrenErrors['_'];
            }
            if (isDataAssigned(childrenErrors)) {
                this.errors = this.withError()
                    ? {...this.errors, ...childrenErrors}
                    : {...childrenErrors};
            }
        }
        return this;
    }

    public result(): JsonObj | undefined {
        return this.withError() ? this.errors : undefined;
    }

    public setItemError(propName: string, errorName: string, error: JsonObj | undefined): boolean {
        const propError = this.getItemState(propName);
        propError.writeError(errorName, error);
        return this.setItemState(propName, propError);
    }

    public setItemErrors(propName: string, error: JsonObj | undefined): void {
        const withError = isDataAssigned(error);
        if (withError) {
            this.errors[propName] = error!;
            this._errorsS.set(asMutable(this.errors));
        } else if (this.errors[propName]) {
            delete this.errors[propName];
            this._errorsS.set(asMutable(this.errors));
        }
    }

    public setItemState(propName: string, result?: ValidationState): boolean {
        const withError = result !== undefined && result.withError();
        if (withError) {
            this.errors[propName] = result.errors;
            this._errorsS.set(asMutable(this.errors));
        } else {
            delete this.errors[propName];
            this._errorsS.set(asMutable(this.errors));
        }
        return withError;
    }

    public setPropertyValidation(propertyName: string, propertyErrors: ValidationState) {
        this.setItemErrors(propertyName, propertyErrors.errors);
    }

    public unassigned(): boolean {
        return (
            isEmptyObj(this.errors) ||
            (Object.values(this.errors).some((value) => value === REQUIRED_ERROR))
        );
    }

    public withError(): boolean {
        return isDataAssigned(this.errors);
    }
}

/**
 *  Class to manipulate a view error state.
 *  A view error state is a dictionnary that will have an entry on each view property that doesn't comply to its type definition.
 *  The value '_' is used as global error regarding to the view type definition.
 *  Example: if a Setview<T> is empty and has a minLength constraint set to 1 its error state
 *  will include an error on '_' to indicate that it should get one item in the list.
 */
export class ValidationHandler implements ValidationState {
    public errors: JsonObj;

    constructor(source?: JsonObj) {
        this.errors = source || {};
    }

    public clear(scope: 'all' | '_' | 'items' = 'all'): void {
        const errors = this.errors as any;
        if (this.withError()) {
            const props = [];
            switch (scope) {
                case 'all': props.push(...Object.keys(errors)); break;
                case '_': props.push('_'); break;
                case 'items': props.push(...Object.keys(errors).filter((p) => p != '_' )); break;
            }
            for (const prop of props) {
                delete errors[prop];
            }
            
        }
    }

    public debug(context: string, isRoot: boolean) {
        const scope = context || '*';
        if (scope === '*') {
            if (this.withError()) {
                JoeLogger.group('MODEL VALIDATION: KO');
                JoeLogger.info(this.errors);
                JoeLogger.endgroup();
            } else {
                JoeLogger.debug('MODEL VALIDATION: OK');
            }
        } else {
            if (this.errors[context]) {
                JoeLogger.group('PROPERTY VALIDATION: ' + context + ' : KO');
                JoeLogger.info(this.errors[context] as object);
                JoeLogger.endgroup();
            } else {
                JoeLogger.debug('PROPERTY VALIDATION:' + context + ' : OK');
            }
        }
    }

    public elementErrorsCount(): number {
        return Object.keys(this.errors).filter((s) => isDataAssigned(this.errors[s])).length;
    }

    public errorCount(scope?: any): number {
        return Object.keys(this.errors).filter((s) => isDataAssigned(this.errors[s])).length;
    }

    public isValid(property?: string): boolean {
        return isBlank(property)
            ? !this.withError()
            : !isDataAssigned(this.errors[property!]);
    }

    public merge(validation?: ValidationHandler) {
        const withError = validation !== undefined && validation.withError;
        if (withError) {
            Object.keys(validation.errors!).forEach((p) => (this.errors[p] = validation.errors[p]));
        }
    }

    public setItemErrors(propName: string, error: JsonObj | undefined): void {
        const withError = isDataAssigned(error);
        if (withError) {
            this.errors[propName] = error!;
        } else if (this.errors[propName]) {
            delete this.errors[propName];
        }
    }

    public setPropertyValidation(propertyName: string, propertyValidationState: ValidationState) {
        if (propertyValidationState.withError()) {
            this.errors[propertyName] = propertyValidationState.errors;
        } else if (this.errors[propertyName]) {
            delete this.errors[propertyName];
        }
    }

    public result(): JsonObj | undefined {
        return this.withError() ? this.errors : undefined;
    }

    public unassigned(): boolean {
        return (
            isEmptyObj(this.errors) ||
            (Object.values(this.errors).some((value) => value === REQUIRED_ERROR))
        );
    }

    public withError(): boolean {
        return this.errorCount() > 0;
    }

    public writeError(errorName: string, errorArgs: JsonObj | undefined): boolean {
        const withError = errorArgs !== undefined;
        if (isDataAssigned(errorArgs)) {
            this.errors[errorName] = errorArgs!;
        } else if (this.errors[errorName]) {
            delete this.errors[errorName];
        }
        return withError;
    }
}

/**
 * Generic error for required field.
 */
export const REQUIRED_ERROR: JsonObj = {_required: {required: true}};
/**
 * Fake error displayed when an asyncronous validation is running.
 * Setting ASYNCRULE_RUNNING_ERROR makes the validation state invalid.
 * It force UI command to wait for the end of the validation.
 */
export const ASYNCRULE_RUNNING_ERROR: JsonObj = {asyncrule: {running: true}};
export const ASYNCRULE_UNIQUEINDEX_ERROR: JsonObj = {uniqueid: {arg: true}};