import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const { compile } = require('react-native-css/compiler');

test('Tailwind touch controls compile to at least 44dp on native', async () => {
  const css = await postcss([tailwind()]).process(readFileSync('global.css', 'utf8'), { from: 'global.css' });
  const sheet = compile(css.css, { filename: 'global.css' }).stylesheet();
  const rules = new Map(sheet.s);
  for (const [className, property] of [['h-11', 'height'], ['w-11', 'width'], ['min-h-11', 'minHeight']]) {
    const declarations = rules.get(className).flatMap(rule => rule.d);
    assert.ok(declarations.some(declaration => declaration[property] === 44), `${className} must render as 44dp, including Android`);
  }
});
