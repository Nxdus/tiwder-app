import { z } from 'zod';

// shortcut: bounded inline photos; move to object storage when gallery usage grows.
export const profilePhotosSchema = z
  .array(
    z
      .string()
      .max(400_000)
      .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)
      .refine((value) => {
        const bytes = Buffer.from(value.split(',')[1] ?? '', 'base64');
        return (
          bytes.length > 4 &&
          bytes[0] === 0xff &&
          bytes[1] === 0xd8 &&
          bytes[2] === 0xff &&
          bytes.at(-2) === 0xff &&
          bytes.at(-1) === 0xd9
        );
      }, 'Invalid JPEG image'),
  )
  .max(6);
