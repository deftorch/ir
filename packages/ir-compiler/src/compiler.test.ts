import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createIRDocument, createIRCanvas, createIRNode, IRError } from 'ir-schema';
import { compileIR, validateIR, parseAndValidateWithRefinement, FileStorage } from './index';
import fs from 'fs';
import path from 'path';

describe('ir-compiler parse & validation', () => {
  const validCanvas = createIRCanvas({ platform: 'web', width: 800, height: 600 });
  const validDoc = createIRDocument({
    domain: 'visual',
    session_id: 'session-123',
    canvas: validCanvas,
    objects: [
      createIRNode({
        type: 'text',
        properties: { content: 'hello' }
      })
    ]
  });

  it('should validate a valid IR document successfully', () => {
    const result = validateIR(validDoc);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail validation for invalid document shape', () => {
    const invalidDoc = {
      meta: {
        schema_version: '1.0', // wrong version
        ir_id: 'not-a-uuid', // invalid format
        domain: 'unknown_domain' // wrong domain
      }
    };

    const result = validateIR(invalidDoc);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    const versionErr = result.errors.find((e) => e.path === '/meta/schema_version');
    expect(versionErr).toBeDefined();

    const uuidErr = result.errors.find((e) => e.path === '/meta/ir_id');
    expect(uuidErr).toBeDefined();
  });

  it('should compile valid JSON string successfully', () => {
    const jsonStr = JSON.stringify(validDoc);
    const result = compileIR(jsonStr);
    expect(result.errors).toEqual([]);
    expect(result.doc).toBeDefined();
    expect(result.doc?.meta.ir_id).toBe(validDoc.meta.ir_id);
  });

  it('should report invalid JSON format', () => {
    const result = compileIR('{ invalid json ');
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].code).toBe('invalid_json');
  });

  it('should handle self-refining loop with success on retry', async () => {
    // Start with a version mismatch error
    const faultyDoc = JSON.parse(JSON.stringify(validDoc));
    faultyDoc.meta.schema_version = '1.0';

    const faultyJson = JSON.stringify(faultyDoc);

    const refiner = async (errors: IRError[]): Promise<string> => {
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].path).toBe('/meta/schema_version');

      // Correct it in the refiner callback
      const corrected = JSON.parse(faultyJson);
      corrected.meta.schema_version = '2.0';
      return JSON.stringify(corrected);
    };

    const result = await parseAndValidateWithRefinement(faultyJson, refiner);
    expect(result).toBeDefined();
    expect(result.meta.schema_version).toBe('2.0');
  });

  it('should abort self-refining loop when max attempts reached', async () => {
    const faultyDoc = JSON.parse(JSON.stringify(validDoc));
    faultyDoc.meta.schema_version = '1.0';
    const faultyJson = JSON.stringify(faultyDoc);

    const refiner = async (_errors: IRError[]): Promise<string> => {
      // Just keep returning the same invalid document
      return faultyJson;
    };

    await expect(parseAndValidateWithRefinement(faultyJson, refiner)).rejects.toThrow(
      /Failed to compile IR Document after 3 refine attempts/
    );
  });
});

describe('ir-compiler storage layer', () => {
  const tempStorageDir = path.join(__dirname, 'test_storage_run');
  let storage: FileStorage;

  const validCanvas = createIRCanvas({ platform: 'web', width: 800, height: 600 });
  const validDoc = createIRDocument({
    domain: 'visual',
    session_id: 'session-abc',
    canvas: validCanvas
  });

  beforeEach(() => {
    storage = new FileStorage(tempStorageDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  it('should save and load an IR document correctly', async () => {
    await storage.saveIR(validDoc);

    const loaded = await storage.loadIR(validDoc.meta.ir_id);
    expect(loaded.meta.ir_id).toBe(validDoc.meta.ir_id);
    expect(loaded.meta.domain).toBe('visual');
    expect(loaded.canvas.platform).toBe('web');
  });

  it('should throw error for non-existent document ID', async () => {
    await expect(storage.loadIR('non-existent-id')).rejects.toThrow(/not found/);
  });

  it('should fork a document correctly with parent reference', async () => {
    await storage.saveIR(validDoc);

    const forked = await storage.forkIR(validDoc.meta.ir_id, 'session-new-fork', 'fork');

    expect(forked.meta.ir_id).not.toBe(validDoc.meta.ir_id);
    expect(forked.meta.parent_ir_id).toBe(validDoc.meta.ir_id);
    expect(forked.meta.session_id).toBe('session-new-fork');
    expect(forked.meta.created_by).toBe('fork');

    // Make sure the forked file is also loaded from storage
    const loadedFork = await storage.loadIR(forked.meta.ir_id);
    expect(loadedFork.meta.parent_ir_id).toBe(validDoc.meta.ir_id);
  });

  it('should deep clone the document to prevent shared reference mutations', async () => {
    const docWithNested = createIRDocument({
      domain: 'visual',
      session_id: 'session-nested',
      canvas: createIRCanvas({ platform: 'web', width: 800, height: 600 }),
      objects: [
        createIRNode({
          id: 'text-node',
          type: 'text',
          properties: { content: 'parent content' }
        })
      ]
    });

    await storage.saveIR(docWithNested);

    const forked = await storage.forkIR(docWithNested.meta.ir_id, 'session-fork-nested', 'fork');

    // Mutate the forked document's nested objects and canvas properties
    forked.canvas.width = 1024;
    forked.objects[0].properties.content = 'forked content';

    // Verify parent document loaded from storage remains unchanged
    const parentLoaded = await storage.loadIR(docWithNested.meta.ir_id);
    expect(parentLoaded.canvas.width).toBe(800);
    expect(parentLoaded.objects[0].properties.content).toBe('parent content');
  });
});
