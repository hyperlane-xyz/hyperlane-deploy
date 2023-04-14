// TODO move these to @hyperlane-xyz/utils
import fs from 'fs';
import path from 'path';

import { objMerge } from '@hyperlane-xyz/sdk';

export function readFileAtPath(filepath: string) {
  if (!fs.existsSync(filepath)) {
    throw Error(`file doesn't exist at ${filepath}`);
  }
  return fs.readFileSync(filepath, 'utf8');
}

export function readJSONAtPath(filepath: string) {
  return JSON.parse(readFileAtPath(filepath));
}

export function readJSON(directory: string, filename: string) {
  return readJSONAtPath(path.join(directory, filename));
}

export function tryReadJSON(directory: string, filename: string) {
  try {
    return readJSONAtPath(path.join(directory, filename));
  } catch (error) {
    return null;
  }
}

export function writeFileAtPath(
  directory: string,
  filename: string,
  value: string,
) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  fs.writeFileSync(path.join(directory, filename), value);
}

export function writeJSON(directory: string, filename: string, obj: any) {
  writeFileAtPath(directory, filename, JSON.stringify(obj, null, 2) + '\n');
}

export function mergeJSON(directory: string, filename: string, obj: any) {
  if (fs.existsSync(path.join(directory, filename))) {
    const previous = readJSON(directory, filename);
    writeJSON(directory, filename, objMerge(previous, obj));
  } else {
    writeJSON(directory, filename, obj);
  }
}
