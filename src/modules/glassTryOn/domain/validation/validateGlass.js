/**
 * validateGlass.js
 * 
 * Validates frame entity attributes for try-on rendering.
 */

export function validateGlass(glass) {
    if (!glass || typeof glass !== 'object') {
        return { isValid: false, error: 'Glass object is required.' };
    }

    if (!glass.id) {
        return { isValid: false, error: 'Glass must have an id.' };
    }

    if (!glass.name) {
        return { isValid: false, error: 'Glass must have a name.' };
    }

    if (!glass.imageUrl && !glass.svg) {
        return { isValid: false, error: 'Glass must provide an imageUrl or svg vector.' };
    }

    return { isValid: true, error: null };
}
