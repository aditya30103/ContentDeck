import { describe, it, expect } from 'vitest';
import { parseContentBlocks } from '../reader';

describe('parseContentBlocks', () => {
  it('returns empty array for empty string', () => {
    expect(parseContentBlocks('')).toEqual([]);
    expect(parseContentBlocks('   ')).toEqual([]);
  });

  it('parses single paragraph', () => {
    const result = parseContentBlocks('This is a paragraph of text that goes on for a while.');
    expect(result).toEqual([
      { type: 'paragraph', text: 'This is a paragraph of text that goes on for a while.' },
    ]);
  });

  it('splits double-newline text into multiple paragraphs', () => {
    const result = parseContentBlocks('First paragraph.\n\nSecond paragraph.');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: 'paragraph', text: 'First paragraph.' });
    expect(result[1]).toEqual({ type: 'paragraph', text: 'Second paragraph.' });
  });

  it('falls back to single-newline splitting when no double newlines exist', () => {
    const result = parseContentBlocks('First paragraph.\nSecond paragraph.\nThird paragraph.');
    expect(result).toHaveLength(3);
    expect(result.every((b) => b.type === 'paragraph')).toBe(true);
  });

  it('detects a short colon-ending line as a heading', () => {
    const result = parseContentBlocks('Overview:\n\nThis is the overview paragraph.');
    const heading = result.find((b) => b.type === 'heading');
    expect(heading).toEqual({ type: 'heading', text: 'Overview:' });
  });

  it('detects a short non-sentence line as a heading', () => {
    const result = parseContentBlocks('Getting Started\n\nHere is the body text for this section.');
    const heading = result.find((b) => b.type === 'heading');
    expect(heading).toEqual({ type: 'heading', text: 'Getting Started' });
  });

  it('does not classify a sentence ending with period as a heading', () => {
    const result = parseContentBlocks('This is a short sentence.');
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('paragraph');
  });

  it('does not classify a long line as a heading even without punctuation', () => {
    const longLine =
      'This is a very long line that exceeds the heading character limit and should be a paragraph not a heading';
    const result = parseContentBlocks(longLine);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('paragraph');
  });

  it('detects hyphen bullet list', () => {
    const text = '- First item\n- Second item\n- Third item';
    const result = parseContentBlocks(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'list',
      items: ['First item', 'Second item', 'Third item'],
    });
  });

  it('detects numbered list', () => {
    const text = '1. First step\n2. Second step\n3. Third step';
    const result = parseContentBlocks(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'list',
      items: ['First step', 'Second step', 'Third step'],
    });
  });

  it('detects bullet list with • character', () => {
    const text = '• Item one\n• Item two\n• Item three';
    const result = parseContentBlocks(text);
    const block = result.find((b) => b.type === 'list');
    expect(block).toBeDefined();
    if (block?.type === 'list') {
      expect(block.items).toHaveLength(3);
    }
  });

  it('does not classify a single list line as a list', () => {
    const result = parseContentBlocks('- Only one item');
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('paragraph');
  });

  it('handles mixed content: heading + paragraph + list', () => {
    const text = [
      'Key Patterns:',
      '',
      'Here is the paragraph explaining the patterns.',
      '',
      '- Pattern one',
      '- Pattern two',
      '- Pattern three',
    ].join('\n');
    const result = parseContentBlocks(text);
    expect(result).toHaveLength(3);
    expect(result[0]!.type).toBe('heading');
    expect(result[1]!.type).toBe('paragraph');
    expect(result[2]!.type).toBe('list');
  });

  it('strips list markers from list items', () => {
    const text = '- Alpha\n- Beta\n- Gamma';
    const result = parseContentBlocks(text);
    const block = result.find((b) => b.type === 'list');
    if (block?.type === 'list') {
      expect(block.items).toEqual(['Alpha', 'Beta', 'Gamma']);
    }
  });
});
