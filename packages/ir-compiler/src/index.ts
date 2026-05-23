import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { schemas, IRDocument, IRError } from 'ir-schema';

// Initialize AJV instance and register schemas from ir-schema
const ajv = new Ajv({
  allErrors: true,
  strict: true,
  schemas: [schemas.canvas, schemas.node, schemas.constraintSet, schemas.document]
});
addFormats(ajv);

const docValidator = ajv.getSchema('https://ir-dsl.org/schemas/document.json');

if (!docValidator) {
  throw new Error('Failed to load IR Document validator schema');
}

/**
 * Translate an AJV error object into the standard IRError format.
 */
export function translateAjvError(err: ErrorObject): IRError {
  let code = err.keyword;
  let message = err.message || 'Validation failed';
  let path = err.instancePath;

  // Enhance message for missing properties
  if (err.keyword === 'required') {
    code = 'missing_required';
    const missingProp = err.params.missingProperty;
    message = `Missing required property: ${missingProp}`;
    path = path ? `${path}/${missingProp}` : `/${missingProp}`;
  } else if (err.keyword === 'additionalProperties') {
    code = 'unexpected_property';
    const extraProp = err.params.additionalProperty;
    message = `Unexpected property: ${extraProp}`;
    path = path ? `${path}/${extraProp}` : `/${extraProp}`;
  } else if (err.keyword === 'type') {
    code = 'type_mismatch';
  } else if (err.keyword === 'format') {
    code = 'format_mismatch';
  } else if (err.keyword === 'enum') {
    code = 'invalid_enum';
  }

  return {
    code,
    message,
    path,
    severity: 'error'
  };
}

/**
 * Validate an IR Document object against the schema.
 */
export function validateIR(doc: unknown): { valid: boolean; errors: IRError[] } {
  if (typeof doc !== 'object' || doc === null) {
    return {
      valid: false,
      errors: [
        {
          code: 'invalid_type',
          message: 'Document must be an object',
          path: '',
          severity: 'error'
        }
      ]
    };
  }

  if (!docValidator) {
    return {
      valid: false,
      errors: [
        {
          code: 'validator_not_initialized',
          message: 'Document validator is not initialized',
          path: '',
          severity: 'error'
        }
      ]
    };
  }

  const isValid = docValidator(doc);

  if (isValid) {
    return { valid: true, errors: [] };
  }

  const errors = (docValidator.errors || []).map(translateAjvError);
  return { valid: false, errors };
}

/**
 * Parse and validate a raw JSON string into an IRDocument.
 */
export function compileIR(rawJson: string): { doc?: IRDocument; errors: IRError[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e: any) {
    return {
      errors: [
        {
          code: 'invalid_json',
          message: `JSON Parsing failed: ${e.message}`,
          path: '',
          severity: 'error'
        }
      ]
    };
  }

  const { valid, errors } = validateIR(parsed);

  if (valid) {
    return { doc: parsed as IRDocument, errors: [] };
  }

  return { errors };
}

/**
 * Parses and validates raw JSON with up to 3 retries using a refiner callback.
 */
export async function parseAndValidateWithRefinement(
  rawJson: string,
  refiner: (errors: IRError[]) => Promise<string>
): Promise<IRDocument> {
  let currentJson = rawJson;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts <= maxAttempts) {
    const { doc, errors } = compileIR(currentJson);

    if (doc && errors.length === 0) {
      return doc;
    }

    if (attempts === maxAttempts) {
      const errorMsg = errors.map((e) => `[${e.code}] at ${e.path}: ${e.message}`).join('; ');
      throw new Error(
        `Failed to compile IR Document after ${maxAttempts} refine attempts. Errors: ${errorMsg}`
      );
    }

    // Call refiner callback to get corrected JSON
    attempts++;
    currentJson = await refiner(errors);
  }

  throw new Error('Unreachable state in parseAndValidateWithRefinement');
}

export * from './storage';
