import fs from 'fs';
import path from 'path';
import { IRDocument, generateUUID } from 'ir-schema';

export class FileStorage {
  private storageDir: string;

  constructor(storageDir?: string) {
    // Default to workspace root .ir_storage if not provided
    this.storageDir = storageDir ?? path.join(process.cwd(), '.ir_storage');
    this.ensureDirectory();
  }

  private ensureDirectory() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getFilePath(irId: string): string {
    // Basic validation of ID to prevent path traversal issues
    const sanitizedId = path.basename(irId);
    return path.join(this.storageDir, `${sanitizedId}.json`);
  }

  /**
   * Saves an IR Document to disk.
   */
  async saveIR(doc: IRDocument): Promise<void> {
    this.ensureDirectory();
    const filePath = this.getFilePath(doc.meta.ir_id);
    await fs.promises.writeFile(filePath, JSON.stringify(doc, null, 2), 'utf-8');
  }

  /**
   * Loads an IR Document from disk by its ID.
   */
  async loadIR(irId: string): Promise<IRDocument> {
    const filePath = this.getFilePath(irId);
    if (!fs.existsSync(filePath)) {
      throw new Error(`IR Document with ID ${irId} not found`);
    }
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content) as IRDocument;
  }

  /**
   * Forks an existing IR Document, creating a copy with a new UUID,
   * setting its parent_ir_id to the source's ir_id, and assigning a new session ID.
   */
  async forkIR(
    parentIrId: string,
    newSessionId: string,
    createdBy: 'human' | 'ai_agent' | 'fork' | 'import' = 'fork'
  ): Promise<IRDocument> {
    const parentDoc = await this.loadIR(parentIrId);
    const newIrId = generateUUID();

    const forkedDoc: IRDocument = {
      ...parentDoc,
      meta: {
        ...parentDoc.meta,
        ir_id: newIrId,
        parent_ir_id: parentIrId,
        session_id: newSessionId,
        created_at: new Date().toISOString(),
        created_by: createdBy
      }
    };

    await this.saveIR(forkedDoc);
    return forkedDoc;
  }
}
