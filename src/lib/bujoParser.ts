import { BulletType } from '../types';

export function parseBuJoEntry(input: string): { type: BulletType; signifiers: { priority: boolean; idea: boolean; explore: boolean }; text: string; } {
  let type: BulletType = 'task'; // default
  const signifiers = { priority: false, idea: false, explore: false };
  
  const hasPriority = /(?:^|\s)\*(?:\s|$)/.test(input);
  const hasIdea = /(?:^|\s)!(?:\s|$)/.test(input);
  const hasExplore = /(?:^|\s)\?(?:\s|$)/.test(input);
  
  if (hasPriority) signifiers.priority = true;
  if (hasIdea) signifiers.idea = true;
  if (hasExplore) signifiers.explore = true;

  const tokens = input.trim().split(/\s+/);
  let contentStartIndex = 0;
  
  let foundType = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (['.', '-', 'o', 'O', '*', '!', '?'].includes(token)) {
      contentStartIndex++;
      
      if (!foundType) {
        if (token === '.') { type = 'task'; foundType = true; }
        else if (token === '-') { type = 'note'; foundType = true; }
        else if (token.toLowerCase() === 'o') { type = 'event'; foundType = true; }
      }
      
      if (token === '*') signifiers.priority = true;
      if (token === '!') signifiers.idea = true;
      if (token === '?') signifiers.explore = true;
    } else {
      break;
    }
  }

  let text = input.trim();
  if (contentStartIndex > 0) {
    const prefixTokens = tokens.slice(0, contentStartIndex);
    const escapedTokens = prefixTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp('^\\s*' + escapedTokens.join('\\s+') + '\\s*');
    text = input.replace(regex, '');
  }

  return { type, signifiers, text };
}
