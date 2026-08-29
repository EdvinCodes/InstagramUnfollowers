import { describe, expect, it } from 'vitest';
import { parsePendingFollowRequests } from './pendingRequestsParser';

const htmlEs = `
<table style="table-layout: fixed;">
  <tr><td class="_a6_q">Nombre</td><td class="_2piu _a6_r">sofia mendez</td></tr>
  <tr><td class="_a6_q">Nombre de usuario</td><td class="_2piu _a6_r">sofi.mendez.00</td></tr>
</table>
<table style="table-layout: fixed;">
  <tr><td class="_a6_q">Nombre</td><td class="_2piu _a6_r">Patri</td></tr>
  <tr><td class="_a6_q">Nombre de usuario</td><td class="_2piu _a6_r">paatrisantana</td></tr>
</table>
<table style="table-layout: fixed;">
  <tr><td class="_a6_q">Nombre</td><td class="_2piu _a6_r">dup</td></tr>
  <tr><td class="_a6_q">Nombre de usuario</td><td class="_2piu _a6_r">sofi.mendez.00</td></tr>
</table>
`;

const htmlEn = `
<table>
  <tr><td class="_a6_q">Name</td><td class="_2piu _a6_r">Camila</td></tr>
  <tr><td class="_a6_q">Username</td><td class="_2piu _a6_r">__camila_robert33</td></tr>
</table>
`;

const jsonExport = JSON.stringify({
  relationships_follow_requests_sent: [
    {
      title: 'sofia mendez',
      string_list_data: [
        {
          href: 'https://www.instagram.com/sofi.mendez.00',
          value: 'sofi.mendez.00',
          timestamp: 1720000000,
        },
      ],
    },
    {
      string_list_data: [
        {
          href: 'https://www.instagram.com/elisafguez/',
          timestamp: 1720000001,
        },
      ],
    },
  ],
});

describe('parsePendingFollowRequests', () => {
  it('parses Spanish Meta HTML and deduplicates usernames', () => {
    expect(parsePendingFollowRequests(htmlEs)).toEqual([
      { username: 'sofi.mendez.00', fullName: 'sofia mendez' },
      { username: 'paatrisantana', fullName: 'Patri' },
    ]);
  });

  it('parses English Meta HTML labels', () => {
    expect(parsePendingFollowRequests(htmlEn)).toEqual([
      { username: '__camila_robert33', fullName: 'Camila' },
    ]);
  });

  it('parses Meta JSON exports from href or value', () => {
    expect(parsePendingFollowRequests(jsonExport)).toEqual([
      { username: 'sofi.mendez.00', fullName: 'sofia mendez', requestedAt: '1720000000' },
      { username: 'elisafguez', fullName: 'elisafguez', requestedAt: '1720000001' },
    ]);
  });

  it('parses pasted usernames', () => {
    expect(parsePendingFollowRequests('@Alpha, beta;\nGAMMA sofi.mendez.00')).toEqual([
      { username: 'alpha', fullName: 'alpha' },
      { username: 'beta', fullName: 'beta' },
      { username: 'gamma', fullName: 'gamma' },
      { username: 'sofi.mendez.00', fullName: 'sofi.mendez.00' },
    ]);
  });

  it('returns an empty list for blank input', () => {
    expect(parsePendingFollowRequests('   ')).toEqual([]);
  });
});
