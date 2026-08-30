import { describe, expect, it } from 'vitest';
import { classifyMetaConnectionsFile, classifyMetaListKind, parseMetaUserList } from './metaExportParser';

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

  it('keeps the date printed next to a Meta table', () => {
    const html = `
      <table>
        <tr><td class="_a6_q">Nombre</td><td class="_2piu _a6_r">Tara Fleitas</td></tr>
        <tr><td class="_a6_q">Nombre de usuario</td><td class="_2piu _a6_r">tarafleitas</td></tr>
      </table>
      <div class="_3-94 _a6-o">ago. 29, 2026 1:09 pm</div>
    `;
    expect(parseMetaUserList(html)).toEqual([
      { username: 'tarafleitas', fullName: 'Tara Fleitas', dateLabel: 'ago. 29, 2026 1:09 pm' },
    ]);
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

describe('classifyMetaListKind', () => {
  it('splits hygiene lists from the scan files', () => {
    expect(classifyMetaListKind('recently_unfollowed_profiles.html', '')).toBe('unfollowed');
    expect(classifyMetaListKind('blocked_profiles.html', '')).toBe('blocked');
    expect(classifyMetaListKind('recent_follow_requests.html', '')).toBe('recent_requests');
    expect(classifyMetaListKind('pending_follow_requests.html', '')).toBe('pending');
    expect(classifyMetaListKind('following.html', '')).toBe('following');
  });

  it('classifies hygiene lists by Spanish titles', () => {
    expect(
      classifyMetaListKind('export.html', '<title>Perfiles a los que has dejado de seguir recientemente</title>'),
    ).toBe('unfollowed');
    expect(classifyMetaListKind('export.html', '<title>Perfiles bloqueados</title>')).toBe('blocked');
    expect(classifyMetaListKind('export.html', '<title>Solicitudes de seguimiento recientes</title>')).toBe(
      'recent_requests',
    );
  });
});
