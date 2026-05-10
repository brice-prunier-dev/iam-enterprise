import {
    isAssigned,
    isBoolean,
    BaseType,
    BooleanDef,
    ValidationHandler,
    ValidationState,
    ValidationScopes
} from '../core';

export class Tbool implements BooleanDef, BaseType {
    public readonly containsScalars: boolean;
    public type: 'boolean';
    public default: boolean;
    public title: string;
    constructor(options: BooleanDef, name?: string) {
        this.type = 'boolean';
        this.containsScalars = true;
        this.default = options.default;
        this.title = name || options.title;
    }

    public defaultValue(): boolean | undefined {
        return isBoolean(this.default) ? (this.default as boolean) : undefined;
    }

    public validate(
        target: any,
        scope: ValidationScopes = ValidationScopes.State
    ): ValidationState {
        const validation = new ValidationHandler();
        if (isAssigned(target)) {
            if (!isBoolean(target)) {
                validation.writeError('_badtype', {typedef: 'Boolean'});
            } else {
                validation.writeError('_badtype', undefined);
            }
        }
        return validation;
    }
}
