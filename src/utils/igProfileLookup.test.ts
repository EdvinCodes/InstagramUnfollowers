import { describe, expect, it } from 'vitest';
import { extractUserIdFromProfileHtml } from './igProfileLookup';

describe('extractUserIdFromProfileHtml', () => {
  it('reads logging_page_id profilePage_{id}', () => {
    expect(
      extractUserIdFromProfileHtml(
        '<script>{"logging_page_id":"profilePage_5537015771"}</script>',
        'someone',
      ),
    ).toBe('5537015771');
  });

  it('reads id next to the matching username', () => {
    const html = JSON.stringify({
      user: { username: 'cristotac21', id: '222333444' },
    });
    expect(extractUserIdFromProfileHtml(html, 'cristotac21')).toBe('222333444');
  });

  it('does not pick a random unrelated id when username is absent', () => {
    expect(extractUserIdFromProfileHtml('{"id":"99999999","username":"other"}', 'cristotac21')).toBeNull();
  });
});
