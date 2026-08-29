import { describe, expect, it } from 'vitest';
import { classifyMetaConnectionsFile, parseMetaUserList } from './metaExportParser';

const followingHtml = `
<title>Siguiendo</title>
<h1>Siguiendo</h1>
<h2 class="_a6-h">miriamsa353</h2>
<a href="https://www.instagram.com/_u/miriamsa353">https://www.instagram.com/_u/miriamsa353</a>
<h2>alpha.user</h2>
<a href="https://www.instagram.com/_u/alpha.user">https://www.instagram.com/_u/alpha.user</a>
`;

const followersHtml = `
<title>Seguidores</title>
<a href="https://www.instagram.com/nevadaviies">nevadaviies</a>
<a href="https://www.instagram.com/miriamsa353">miriamsa353</a>
`;

describe('parseMetaUserList', () => {
  it('parses following.html links and headings without duplicates', () => {
    expect(parseMetaUserList(followingHtml).map(user => user.username).sort()).toEqual([
      'alpha.user',
      'miriamsa353',
    ]);
  });

  it('parses followers.html profile links', () => {
    expect(parseMetaUserList(followersHtml).map(user => user.username)).toEqual([
      'nevadaviies',
      'miriamsa353',
    ]);
  });

  it('still parses Spanish Meta tables', () => {
    const html = `
      <table>
        <tr><td class="_a6_q">Nombre</td><td class="_2piu _a6_r">Sofia</td></tr>
        <tr><td class="_a6_q">Nombre de usuario</td><td class="_2piu _a6_r">sofi.mendez.00</td></tr>
      </table>
    `;
    expect(parseMetaUserList(html)).toEqual([{ username: 'sofi.mendez.00', fullName: 'Sofia' }]);
  });
});

describe('classifyMetaConnectionsFile', () => {
  it('classifies by filename', () => {
    expect(classifyMetaConnectionsFile('following.html', '')).toBe('following');
    expect(classifyMetaConnectionsFile('followers_1.html', '')).toBe('followers');
    expect(classifyMetaConnectionsFile('pending_follow_requests.html', '')).toBe('other');
    expect(classifyMetaConnectionsFile('recent_follow_requests.html', '')).toBe('other');
    expect(classifyMetaConnectionsFile('recently_unfollowed_profiles.html', '')).toBe('other');
    expect(classifyMetaConnectionsFile('blocked_profiles.html', '')).toBe('other');
    expect(classifyMetaConnectionsFile('followers_and_following/following.html', '')).toBe('following');
    expect(classifyMetaConnectionsFile('followers_and_following/followers_1.html', '')).toBe('followers');
    expect(classifyMetaConnectionsFile('followers_and_following\\followers_2.html', '')).toBe('followers');
  });

  it('classifies by page title when the name is generic', () => {
    expect(classifyMetaConnectionsFile('export.html', followingHtml)).toBe('following');
    expect(classifyMetaConnectionsFile('export.html', followersHtml)).toBe('followers');
  });
});
