import { profilePhotosSchema } from './profile-photos.js';

describe('profile photo validation', () => {
  const photo =
    'data:image/jpeg;base64,' +
    Buffer.from([255, 216, 255, 0, 255, 217]).toString('base64');
  it('accepts clearing and up to six JPEG photos', () => {
    expect(profilePhotosSchema.safeParse([]).success).toBe(true);
    expect(profilePhotosSchema.safeParse(Array(6).fill(photo)).success).toBe(
      true,
    );
  });
  it('rejects excess photos, oversized data, other formats and fake JPEGs', () => {
    for (const photos of [
      Array(7).fill(photo),
      [photo + 'A'.repeat(400_000)],
      ['data:image/svg+xml;base64,PHN2Zz4='],
      ['https://example.com/photo.jpg'],
      ['data:image/jpeg;base64,aGVsbG8='],
    ]) {
      expect(profilePhotosSchema.safeParse(photos).success).toBe(false);
    }
  });
});
