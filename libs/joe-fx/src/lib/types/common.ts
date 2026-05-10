import { IViewElement, splitPath } from '../core';
/**
 * this method links the validation state of a child view to its parent view
 * until root element.
 * @param obj source view
 */
export function corelateValidationWithParents(obj: IViewElement) {
    if(obj.$src.attached && !obj.$isRoot()) {
        // const root = obj.$root();
        let current = obj;
        let parent = obj.$parent();
        let run = current !== parent;
        while (run) {
            const path = current.$src.path;
            if (current.$validation.withError()) {
                if(parent.$validation.errors[path] !== current.$validation.errors) {
                    parent.$validation.errors[path] = current.$validation.errors;
                } else {
                    return;
                }
            } else  if(parent.$validation.errors[path] ) {
                delete parent.$validation.errors[path];
            } else {
                return;
            }
            
            const attachedToParent = current.$src.attached;
            current = parent;
            parent = parent.$parent();
            run = attachedToParent && current !== parent;
        }
    }
}
