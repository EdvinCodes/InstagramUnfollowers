import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyMetaConnectionsFile, parseMetaUserList } from './metaExportParser';
import { buildMetaScanResults } from './metaScan';

const dumpDir = process.env.META_DUMP_DIR;

describe.skipIf(!dumpDir || !existsSync(join(dumpDir, 'following.html')))(
  'Meta connections dump (optional)',
  () => {
    it('parses following.html and followers_1.html from a real export', () => {
      const followingHtml = readFileSync(join(dumpDir as string, 'following.html'), 'utf8');
      const followersHtml = readFileSync(join(dumpDir as string, 'followers_1.html'), 'utf8');

      expect(classifyMetaConnectionsFile('following.html', followingHtml)).toBe('following');
      expect(classifyMetaConnectionsFile('followers_1.html', followersHtml)).toBe('followers');

      const following = parseMetaUserList(followingHtml);
      const followers = parseMetaUserList(followersHtml);
      expect(following.length).toBeGreaterThan(0);
      expect(followers.length).toBeGreaterThan(0);

      const results = buildMetaScanResults(following, followers);
      expect(results).toHaveLength(following.length);
      expect(results.some(user => user.follows_viewer)).toBe(true);
      expect(results.some(user => !user.follows_viewer)).toBe(true);
    });
  },
);
