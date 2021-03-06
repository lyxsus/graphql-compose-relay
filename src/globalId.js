/* @flow */

import type {
  ResolvedGlobalId,
  Base64String,
} from './definition.js';

export function base64(i: string): Base64String {
  return ((new Buffer(i, 'ascii')).toString('base64'));
}

export function unbase64(i: Base64String): string {
  return ((new Buffer(i, 'base64')).toString('ascii'));
}

/**
 * Takes a type name and an ID specific to that type name, and returns a
 * "global ID" that is unique among all types.
 */
export function toGlobalId(type: string, id: string | number): string {
  return base64([type, id].join(':'));
}

/**
 * Takes the "global ID" created by toGlobalID, and returns the type name and ID
 * used to create it.
 */
export function fromGlobalId(globalId: string): ResolvedGlobalId {
  const unbasedGlobalId = unbase64(globalId);
  const delimiterPos = unbasedGlobalId.indexOf(':');
  return {
    type: unbasedGlobalId.substring(0, delimiterPos),
    id: unbasedGlobalId.substring(delimiterPos + 1),
  };
}
