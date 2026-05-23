import { IRDocument } from 'ir-schema';
import { computeLayout } from './layout';
import { renderWeb } from './renderer';

export { computeLayout, ComputedLayout } from './layout';
export { renderWeb, cssColor } from './renderer';

/**
 * Compiles a fully resolved IRDocument into web-ready HTML/CSS.
 */
export function renderDocument(doc: IRDocument) {
  const layouts = computeLayout(doc);
  return renderWeb(doc, layouts);
}
