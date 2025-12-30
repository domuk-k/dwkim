/**
 * Remark plugin to transform Obsidian-style callouts to HTML
 *
 * Transforms:
 *   > [!term] Title
 *   > Content
 *
 * To:
 *   <div class="callout callout-term">
 *     <div class="callout-title">Title</div>
 *     <div class="callout-content">Content</div>
 *   </div>
 */

import { visit } from 'unist-util-visit';
import { toHtml } from 'hast-util-to-html';
import { toHast } from 'mdast-util-to-hast';

const CALLOUT_REGEX = /^\[!(\w+)\]\s*(.*)$/;

export default function remarkObsidianCallouts() {
  return (tree) => {
    visit(tree, 'blockquote', (node, index, parent) => {
      if (!node.children || node.children.length === 0) return;

      // Get first paragraph
      const firstChild = node.children[0];
      if (firstChild.type !== 'paragraph' || !firstChild.children) return;

      // Get first text content
      const firstText = firstChild.children[0];
      if (firstText?.type !== 'text') return;

      const match = firstText.value.match(CALLOUT_REGEX);
      if (!match) return;

      const [fullMatch, calloutType, titleText] = match;
      const type = calloutType.toLowerCase();

      // Build title
      const title = titleText || `💡 ${type.toUpperCase()}`;

      // Get content: remaining text in first paragraph + rest of blockquote
      const remainingFirstText = firstText.value.slice(fullMatch.length).trim();

      // Build content parts
      let contentParts = [];

      // Add remaining text from first paragraph
      if (remainingFirstText || firstChild.children.length > 1) {
        const modifiedFirstChild = {
          ...firstChild,
          children: [
            ...(remainingFirstText ? [{ type: 'text', value: remainingFirstText }] : []),
            ...firstChild.children.slice(1)
          ]
        };
        if (modifiedFirstChild.children.length > 0) {
          contentParts.push(modifiedFirstChild);
        }
      }

      // Add remaining blockquote children
      contentParts.push(...node.children.slice(1));

      // Convert content to HTML
      let contentHtml = '';
      for (const child of contentParts) {
        try {
          const hast = toHast(child);
          if (hast) {
            contentHtml += toHtml(hast);
          }
        } catch (e) {
          // Fallback: just get text content
          if (child.type === 'paragraph' && child.children) {
            contentHtml += '<p>' + child.children.map(c => c.value || '').join('') + '</p>';
          }
        }
      }

      // Create HTML node
      const htmlNode = {
        type: 'html',
        value: `<div class="callout callout-${type}">
<div class="callout-title">${escapeHtml(title)}</div>
<div class="callout-content">${contentHtml}</div>
</div>`
      };

      // Replace blockquote with HTML
      parent.children.splice(index, 1, htmlNode);
    });
  };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
