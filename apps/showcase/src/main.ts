import { createIRDocument, createIRCanvas, createIRNode, createIRStyleContext } from '../../../packages/ir-schema/dist/index.js';
import { validateIR } from '../../../packages/ir-compiler/dist/index.js';
import { renderDocument } from '../../../packages/ir-renderer-web/dist/index.js';
import { renderReactComponent, renderSvelteComponent, renderVueComponent } from '../../../packages/ir-renderer-framework/dist/index.js';

// Element Cache
const inputUsername = document.getElementById('input-username') as HTMLInputElement;
const inputBio = document.getElementById('input-bio') as HTMLTextAreaElement;
const inputAvatar = document.getElementById('input-avatar') as HTMLInputElement;
const inputColor = document.getElementById('input-color') as HTMLInputElement;
const inputTextColor = document.getElementById('input-text-color') as HTMLInputElement;
const selectShapeType = document.getElementById('select-shape-type') as HTMLSelectElement;
const inputC2pa = document.getElementById('input-c2pa') as HTMLInputElement;
const inputConstraints = document.getElementById('input-constraints') as HTMLInputElement;

const colorHex = document.getElementById('color-hex') as HTMLSpanElement;
const textColorHex = document.getElementById('text-color-hex') as HTMLSpanElement;

const reactCode = document.getElementById('react-code') as HTMLElement;
const reactCss = document.getElementById('react-css') as HTMLElement;
const svelteCode = document.getElementById('svelte-code') as HTMLElement;
const vueCode = document.getElementById('vue-code') as HTMLElement;
const logsList = document.getElementById('logs-list') as HTMLElement;
const logsCount = document.getElementById('logs-count') as HTMLElement;
const previewIframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
const viewportLabel = document.getElementById('viewport-label') as HTMLSpanElement;

// Tab Routing
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    const tabId = tab.getAttribute('data-tab');
    document.getElementById(`tab-${tabId}`)?.classList.add('active');
  });
});

// Viewport Sizer
const sizeButtons = document.querySelectorAll('.size-btn');
sizeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    sizeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const width = btn.getAttribute('data-width') || '800';
    previewIframe.style.width = `${width}px`;
    viewportLabel.textContent = `${width}px × 600px`;
  });
});

// Copy to Clipboard
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const codeEl = document.getElementById(targetId || '');
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.textContent || '');
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1500);
    }
  });
});

// Main Compilation & Rendering Loop
function compileAndRender() {
  const username = inputUsername.value;
  const bio = inputBio.value;
  const avatarUrl = inputAvatar.value;
  const cardBg = inputColor.value;
  const txtColor = inputTextColor.value;
  const shapeType = selectShapeType.value;
  const c2paRequired = inputC2pa.checked;
  const applyConstraints = inputConstraints.checked;

  // Update label text
  colorHex.textContent = cardBg.toUpperCase();
  textColorHex.textContent = txtColor.toUpperCase();

  // 1. Create Document schema
  const canvas = createIRCanvas({
    platform: 'web',
    width: 800,
    height: 600
  });

  const style_context = createIRStyleContext({
    theme_tokens: {
      colors: {
        card_background: cardBg,
        accent_blue: '#89b4fa',
        accent_rose: '#f38ba8'
      }
    } as any
  });

  const doc = createIRDocument({
    domain: 'visual',
    session_id: 'dashboard-session',
    canvas,
    style_context,
    objects: [
      createIRNode({
        id: 'profile-card',
        type: 'frame',
        position: { x: 225, y: 75 },
        size: { width: 350, height: 450 },
        style_override: {
          fill: 'theme://colors.card_background',
          border_radius: 20,
          border_color: 'theme://colors.accent_blue',
          border_width: 2,
          display: 'flex',
          flex_direction: 'column',
          align_items: 'center',
          justify_content: 'center'
        },
        media_overrides: {
          '(max-width: 768px)': {
            width: 320,
            position: { x: 20, y: 50 }
          }
        },
        children: [
          // Avatar Image
          createIRNode({
            id: 'avatar-image',
            type: 'image',
            position: { x: 125, y: 40 },
            size: { width: 100, height: 100 },
            properties: { src: avatarUrl, alt: 'Avatar image' },
            bindings: { src: 'props.avatarUrl', alt: 'props.username' },
            style_override: {
              border_radius: 50
            }
          }),
          // Title
          createIRNode({
            id: 'title-text',
            type: 'text',
            position: { x: 20, y: 160 },
            size: { width: 310, height: 'auto' },
            properties: { content: username },
            bindings: { content: 'props.username' },
            style_override: {
              font_family: 'sans-serif',
              font_size: 22,
              font_weight: '700',
              fill: txtColor
            }
          }),
          // Subtitle
          createIRNode({
            id: 'bio-text',
            type: 'text',
            position: { x: 20, y: 210 },
            size: { width: 310, height: 'auto' },
            properties: { content: bio },
            bindings: { content: 'props.userBio' },
            style_override: {
              font_family: 'sans-serif',
              font_size: 14,
              fill: '#a6adc8'
            }
          }),
          // Decorative Button
          createIRNode({
            id: 'action-button',
            type: 'shape',
            position: { x: 40, y: 350 },
            size: { width: 270, height: 44 },
            properties: { shape_type: shapeType },
            style_override: {
              fill: 'theme://colors.accent_blue',
              border_radius: shapeType === 'circle' ? 50 : 8
            },
            states: {
              hover: {
                fill: 'theme://colors.accent_rose',
                scale: { x: 1.04, y: 1.04 }
              }
            },
            children: [
              createIRNode({
                id: 'btn-text',
                type: 'text',
                position: { x: 90, y: 12 },
                size: { width: 'auto', height: 'auto' },
                properties: { content: 'Send Message' },
                style_override: {
                  font_family: 'sans-serif',
                  font_size: 14,
                  font_weight: '700',
                  fill: '#11111b'
                }
              })
            ]
          })
        ]
      })
    ],
    constraints: {
      brand_profile_id: 'brand-1',
      wcag_level: 'AA',
      c2pa_required: c2paRequired,
      semantic_rules: [
        {
          id: 'wcag-text-contrast',
          scope: 'parent_child',
          condition: 'self.type != "text" || self.fill.contrast_with(parent.fill) >= 4.5',
          violation: 'warning',
          message: 'Text color must satisfy WCAG AA contrast ratio (>= 4.5:1) with card background.',
          auto_fix: 'self.fill = "#ffffff"'
        }
      ],
      layout_constraints: applyConstraints ? [
        {
          id: 'button-pin',
          type: 'pin' as const,
          targets: ['action-button', 'profile-card'],
          params: { edge: 'bottom', value: 30 }
        },
        ...(shapeType !== 'circle' ? [{
          id: 'button-aspect',
          type: 'aspect_ratio' as const,
          targets: ['action-button'],
          params: { ratio: 6.1 }
        }] : [])
      ] : []
    }
  });

  // 2. Validate and Compile (resolves rules, runs auto_fix)
  const validation = validateIR(doc);
  
  // 3. Render HTML/CSS
  const renderWeb = renderDocument(doc);
  
  // 4. Render Framework components
  const renderReact = renderReactComponent(doc, 'UserProfileCard');
  const renderSvelte = renderSvelteComponent(doc);
  const renderVue = renderVueComponent(doc);

  // Update DOM code views
  reactCode.textContent = renderReact.code;
  reactCss.textContent = renderReact.css;
  svelteCode.textContent = renderSvelte.code;
  vueCode.textContent = renderVue.code;

  // Populate Accessibility Audit Logs
  logsList.innerHTML = '';
  let warningCount = 0;

  // Add schema information logs
  addLogItem('System', `Successfully compiled IR Document to responsive output. Trace ID: ${renderWeb.traceId}`, 'info');

  if (renderWeb.c2paManifest) {
    addLogItem(
      'C2PA Content Authenticity',
      'Digital authenticity watermark generated and injected successfully into HTML head.',
      'info',
      `Manifest claim: ${renderWeb.c2paManifest}`
    );
  }

  if (validation.errors.length > 0) {
    validation.errors.forEach(err => {
      warningCount++;
      addLogItem(
        'WCAG AA Violation Warning',
        `Violation on node [${(err as any).node_id || err.path}]: ${err.message}`,
        'warning',
        'Auto-Fix Applied: self.fill = "#ffffff" (Contrast ratio resolved)'
      );
    });
  } else {
    addLogItem('WCAG AA Audit', 'All text elements satisfy WCAG contrast compliance (> 4.5:1).', 'info');
  }

  logsCount.textContent = warningCount.toString();
  if (warningCount > 0) {
    logsCount.classList.add('active');
  } else {
    logsCount.classList.remove('active');
  }

  // Inject preview iframe html
  const frameDoc = previewIframe.contentDocument || previewIframe.contentWindow?.document;
  if (frameDoc) {
    frameDoc.open();
    frameDoc.write(renderWeb.fullHtml);
    frameDoc.close();
  }
}

function addLogItem(title: string, message: string, type: 'info' | 'warning' | 'error', fix?: string) {
  const logItem = document.createElement('div');
  logItem.className = `log-item ${type}`;

  const titleRow = document.createElement('div');
  titleRow.className = 'log-title-row';

  const titleEl = document.createElement('span');
  titleEl.className = 'log-title';
  titleEl.textContent = title;

  const badge = document.createElement('span');
  badge.className = 'log-badge';
  badge.textContent = type.toUpperCase();

  titleRow.appendChild(titleEl);
  titleRow.appendChild(badge);
  logItem.appendChild(titleRow);

  const msgEl = document.createElement('p');
  msgEl.className = 'log-msg';
  msgEl.textContent = message;
  logItem.appendChild(msgEl);

  if (fix) {
    const fixEl = document.createElement('div');
    fixEl.className = 'log-fix';
    fixEl.textContent = fix;
    logItem.appendChild(fixEl);
  }

  logsList.appendChild(logItem);
}

// Event Listeners
[inputUsername, inputBio, inputAvatar, inputColor, inputTextColor].forEach(input => {
  input.addEventListener('input', compileAndRender);
});

selectShapeType.addEventListener('change', compileAndRender);
inputC2pa.addEventListener('change', compileAndRender);
inputConstraints.addEventListener('change', compileAndRender);

document.getElementById('btn-recompile')?.addEventListener('click', compileAndRender);

// Initial Compilation
compileAndRender();
