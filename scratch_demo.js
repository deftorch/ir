const { createIRDocument, createIRCanvas, createIRNode, createIRStyleContext } = require('./packages/ir-schema/dist/index.js');
const { validateIR } = require('./packages/ir-compiler/dist/index.js');
const { renderDocument } = require('./packages/ir-renderer-web/dist/index.js');
const fs = require('fs');
const path = require('path');

// 1. Create a beautiful Canvas & Style Context
const canvas = createIRCanvas({
  platform: 'web',
  width: 800,
  height: 600
});

const style_context = createIRStyleContext({
  theme_tokens: {
    colors: {
      fill: '#1e1e2e', // Sleek dark mode canvas color
      stroke: '#313244',
      background_color: '#11111b'
    },
    typography: {
      families: { sans: 'Inter, system-ui, sans-serif' },
      sizes: { title: 32, body: 16 },
      weights: { normal: 400, bold: 700 },
      line_heights: { normal: 1.5 },
      spacings: { normal: 8 }
    },
    spacing: { p4: 16 },
    radii: { rounded: 12 },
    shadows: {},
    easings: {},
    durations: {}
  },
  component_styles: {
    'card-style': {
      fill: '#181825',
      border_color: '#45475a',
      border_width: 2,
      border_radius: 16
    },
    'button-style': {
      fill: '#89b4fa', // Cool blue accent color
      border_radius: 8
    }
  }
});

// 2. Define beautiful nodes
const doc = createIRDocument({
  domain: 'visual',
  session_id: 'demo-session',
  canvas,
  style_context,
  objects: [
    // Outer Frame (Card container)
    createIRNode({
      id: 'card-1',
      type: 'frame',
      position: { x: 100, y: 100, z: 0 },
      size: { width: 600, height: 400 },
      style_ref: 'card-style',
      media_overrides: {
        '(max-width: 768px)': {
          width: 360,
          position: { x: 10, y: 50 },
          fill: '#11111b'
        }
      },
      children: [
        // Title Text
        createIRNode({
          id: 'title-1',
          type: 'text',
          position: { x: 40, y: 40, z: 0 },
          size: { width: 'auto', height: 'auto' },
          properties: { content: 'IR Web Renderer Demo' },
          style_override: {
            font_family: 'Inter, system-ui, sans-serif',
            font_size: 28,
            font_weight: '700',
            fill: '#cdd6f4' // White text color
          }
        }),
        // Subtitle Text
        createIRNode({
          id: 'desc-1',
          type: 'text',
          position: { x: 40, y: 90, z: 0 },
          size: { width: 520, height: 'auto' },
          properties: { content: 'This card and its contents were compiled using the IR Pipeline, resolving cascading styles and computing absolute layouts dynamically.' },
          style_override: {
            font_family: 'Inter, system-ui, sans-serif',
            font_size: 16,
            fill: '#222222'
          }
        }),
        // Accent Circle Shape
        createIRNode({
          id: 'badge-1',
          type: 'shape',
          position: { x: 40, y: 160, z: 0 },
          size: { width: 120, height: 120 },
          style_override: {
            fill: '#f38ba8', // Rosebud Red accent circle
            border_radius: 60
          }
        }),
        // Inner Card box
        createIRNode({
          id: 'box-1',
          type: 'shape',
          position: { x: 190, y: 160, z: 0 },
          size: { width: 370, height: 120 },
          style_override: {
            fill: '#313244',
            border_radius: 12,
            display: 'flex',
            flex_direction: 'column',
            justify_content: 'center',
            align_items: 'center',
            gap: 8
          },
          children: [
            createIRNode({
              id: 'box-text-1',
              type: 'text',
              position: { x: 0, y: 0 },
              size: { width: 'auto', height: 'auto' },
              properties: { content: 'Nested Child Element' },
              style_override: {
                font_family: 'Inter, system-ui, sans-serif',
                font_size: 18,
                font_weight: '600',
                fill: '#f5e0dc'
              }
            }),
            createIRNode({
              id: 'box-text-2',
              type: 'text',
              position: { x: 0, y: 0 },
              size: { width: 'auto', height: 'auto' },
              properties: { content: 'Sub-item aligned via Flexbox' },
              style_override: {
                font_family: 'Inter, system-ui, sans-serif',
                font_size: 14,
                font_weight: '400',
                fill: '#a6adc8'
              }
            })
          ]
        }),
        // Action Button
        createIRNode({
          id: 'button-1',
          type: 'shape',
          position: { x: 40, y: 310, z: 0 },
          size: { width: 520, height: 50 },
          style_ref: 'button-style',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          states: {
            hover: {
              fill: '#a6e3a1',
              scale: { x: 1.02, y: 1.02 }
            },
            active: {
              fill: '#94e2d5',
              scale: { x: 0.98, y: 0.98 }
            }
          },
          media_overrides: {
            '(max-width: 768px)': {
              width: 280,
              position: { x: 40, y: 320 }
            }
          },
          children: [
            createIRNode({
              id: 'btn-text',
              type: 'text',
              position: { x: 210, y: 15, z: 0 },
              size: { width: 'auto', height: 'auto' },
              properties: { content: 'Acknowledge & Confirm' },
              style_override: {
                font_family: 'Inter, system-ui, sans-serif',
                font_size: 16,
                font_weight: '700',
                fill: '#11111b'
              },
              media_overrides: {
                '(max-width: 768px)': {
                  position: { x: 50, y: 15 },
                  font_size: 14
                }
              }
            })
          ]
        })
      ]
    })
  ],
  constraints: {
    semantic_rules: [
      {
        id: 'text-contrast-wcag',
        scope: 'parent_child',
        condition: 'self.type != "text" || self.fill.contrast_with(parent.fill) >= 4.5',
        violation: 'warning',
        message: 'Text contrast must satisfy WCAG AA (>= 4.5)',
        auto_fix: 'self.fill = "#ffffff"'
      }
    ]
  }
});

// 3. Compile and Validate (resolves Style Cascade, executes semantic constraints & auto_fix)
const compileResult = validateIR(doc);
console.log('Compilation Successful:', compileResult.valid);
if (!compileResult.valid || compileResult.errors.length > 0) {
  console.log('Errors:', compileResult.errors);
}

// 4. Render the verified document to web package HTML/CSS
const { evaluateExpression } = require('./packages/ir-compiler/dist/semantic-dsl.js');
console.log('title-1 fill:', evaluateExpression('self.fill', { self: doc.objects[0].children[0], document: doc, canvas }));
console.log('card-1 fill:', evaluateExpression('self.fill', { self: doc.objects[0], document: doc, canvas }));
console.log('contrast:', evaluateExpression('self.fill.contrast_with(parent.fill)', { self: doc.objects[0].children[0], parent: doc.objects[0], document: doc, canvas }));

const renderResult = renderDocument(doc);

// 5. Save the output
const outPath = path.join(__dirname, 'demo_output.html');
fs.writeFileSync(outPath, renderResult.fullHtml);
console.log('Saved rendered output html to:', outPath);
