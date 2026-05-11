import {asFunction, asJsObject, asString, isString } from './types-helper';
import {IElementMessage, IRuntimeSummary, IViewElement, StringMap, JsonObj} from './types';
import {ElementMessageType} from './enums';
import {isArrayAssigned, isBlank, isObjAssigned} from './types-tester';





const translationRepository: {[x: string]: TranslatorFn} = {};

export type TranslatorFn = (args: Record<string, unknown>) => string;

/**
 * Static class that publish static functions to manage type model errors. 
 */
export class RuntimeError {
    /**
     * Error `translator` registration.
     * @param errorReference Error identifier.
     * @param translator Function that turn an errorReference and its arguments into a human readable message.
     */
    public static register(errorReference: string, translator: TranslatorFn) {
        translationRepository[errorReference] = translator;
    }

    /**
     * turn an error reference and its arguments into a human readable message.
     * @param errorReference Error identifier.
     * @param args Runtime arguments of the error.
     * @returns Human readable message that describe the error.
     */
    public static errorText(errorReference: string, args: Record<string, unknown>): string {
    
        const translator = translationRepository[errorReference];
        let msg = '';
        if (asFunction(translator)) {
            msg = translator(args);
        } else {
            const argTxt = JSON.stringify(args, null, 2);
            msg = `Missing register message: ${errorReference} with ${argTxt}`;
        }
        return msg;
    }

    /**
     * turn a map of error rferences with their arguments into a human readable message.
     * @param args Runtime arguments of the error.
     * @returns Human readable message that describe the error.
     */
    public static asText(args: Record<string, Record<string, unknown>>): string | null {
    
        let msg: string | null = null
        if (isObjAssigned(args)) {
            const keys = Object.keys(args);
            let sep = '';
            msg = '';
            if (isArrayAssigned(keys)) {
                keys.forEach((errortype) => {
                    msg += sep + RuntimeError.errorText(errortype, args[errortype]);
                    sep = ', ';
                });
            }
        }
        return msg;
    }

    /**
     * Generic method to turn an error payload into a message.
     * @param payload Error definition.
     * @returns Human readable message that describe the error.
     */
    public static asString(payload: unknown): string | null {
        if (!payload) {
            return null;
        }

        if (asString(payload)) {
            return payload.substring(0, 100);

        } else if (asJsObject(payload)) {
            const error = payload['error'];
            if (error) {
                return RuntimeError.asString(error);
            }
            const message = payload['message'];
            if (message) {
                return RuntimeError.asString(message);
            }
            const data = payload['data'];
            if (data) {
                return RuntimeError.asString(data);
            }
        }
        if (asFunction(payload)) {
            return RuntimeError.asString(payload());
        }
        return JSON.stringify(payload).substring(0, 100);
    }
    /**
     * Generic method to turn an error payload into a Error instance.
     * @param payload Error definition.
     * @returns Javascript Error instance.
     */
    public static asError(payload: unknown): Error | undefined {
        if (isBlank(payload)) {
            return undefined;
        }
        if (payload instanceof Error) {
            return payload as Error;
        }
        if (isString(payload)) {
            return new Error(payload);
        }
        const errorMessage =  RuntimeError.asString(payload) ?? 'Unknown Error';
        return new Error(errorMessage);
    }
}

/**
 * Normalize JOE message having attributes to qualify the origin of the message.
 * 
 * - path: JOE pointer on the Element,
 * - qualifier: Either a tuple composed of an instance Path and the error|property identifier or an empty array,
 * - type: ElementMessageType,
 */
export class RuntimeMessage implements IElementMessage {

    constructor(
        public readonly msg: string,
        public readonly path: string,
        public readonly qualier: string,
        public readonly type: ElementMessageType = ElementMessageType.Error
    ) { }



}
/**
 * Messages containers
 * 
 * @example
 * Usefull to list all the errors of an instance
 */
export class RuntimeSummary implements IRuntimeSummary {
    private _hasError = false;
    private _messages: IElementMessage[];

    constructor() {
        this._messages = [];
    }

    /**
     * Inner messages collection publication.
     * 
     * @remark
     * pattern to keep the messages collection private and immutable.
     */
    public get messages(): IElementMessage[] {
        return this._messages;
    }

    /**
     * No error message in the private _message collection. 
     */
    public get isValid(): boolean {
        return !this._hasError;
    }

    /**
     * Is there a message in the private _message collection. 
     */
    public get hasMessages(): boolean {
        return this._messages.length > 0;
    }

    /**
     * Clear the private _message collection.
     * @returns 
     */
    public clear(): IRuntimeSummary {
        this._messages = [];
        this._hasError = false;
        return this;
    }


    public push(msg: RuntimeMessage): RuntimeSummary {
        this._messages.push(msg);
        this._hasError = this._hasError || msg.type === ElementMessageType.Error;
        return this;
    }

    public fill(view: IViewElement): RuntimeSummary {
        var errors = view.$validation.errors;
        view.$src.type.fillValidationSummary(errors, this, view.$src.path);
        return this;
    }

    public fillErrors(errors: JsonObj): RuntimeSummary {
        for (const errorIndex in errors) {
            const arrayErrors = errors[errorIndex] as JsonObj ;
            for (const arrayErrorTypology in arrayErrors) {
                const errorArgs = arrayErrors[arrayErrorTypology] as StringMap;
                const msg = RuntimeError.errorText(arrayErrorTypology, errorArgs);

                this.push(
                    new RuntimeMessage(
                        msg,
                        errorIndex, 
                        arrayErrorTypology,
                        ElementMessageType.Error
                    )
                );
                }
                
            } 
        return this;
    }



}



RuntimeError.register('_required', () => {
    return `Required!`;
});

RuntimeError.register('_badtype', (args) => {
    const typedef = args['typedef'];
    const subtypedef = args['subtypedef'];
    return subtypedef === undefined
        ? `Should be a ${typedef} !`
        : `Should be a ${typedef} ${subtypedef}!`;
});
