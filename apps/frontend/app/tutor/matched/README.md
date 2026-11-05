# Tutor matched

- Route: `/tutor/matched`
- อ้างอิง [Match-Tutor ใน Figma](https://www.figma.com/design/jDGcDvkt4vOq8LKIVsmIHB/Web-Pro?node-id=15-561): การ์ดกว้าง 330px, grid สูงสุด 3 คอลัมน์, ช่องว่างแนวนอน 40px และแนวตั้ง 50px เท่าหน้า Swiped รองรับการลดคอลัมน์ตามพื้นที่จอ
- ใช้ `StudentCard`, `TutorHeader`, Card, Badge, Button และ Separator เดิม พร้อมสีจาก theme ของ shadcn
- วันเวลาและราคาอยู่ด้านล่างของรูปในบรรทัดเดียว ใช้ชื่อวันแบบย่อ และตัดข้อความด้วย ellipsis เฉพาะเมื่อพื้นที่ไม่พอ โดยดูข้อความเต็มได้จาก title สถานะอยู่มุมบนขวาของรายละเอียด: `Upcoming` (รอเรียน), `In Progress` (กำลังเรียน), `Completed` (เสร็จสิ้นแล้ว สีเขียว)
- `getConfirmedMatches` แสดงเฉพาะรายการที่ `tutorConfirmed` และ `studentConfirmed` เป็น `true` ทั้งคู่ การยืนยันเวลาของ tutor ฝ่ายเดียวไม่ทำให้แสดงการ์ด และมี empty state เมื่อไม่มีรายการที่ผ่านเงื่อนไข
- เมนู Matched เชื่อมจากหน้า Swiped และ time slot แล้ว โดยใช้ `aria-current` ระบุเมนูปัจจุบัน

## ข้อมูล

`demo-matches.ts` เป็นข้อมูลตัวอย่าง 6 รายการที่ยืนยันทั้งสองฝ่ายแล้ว เพื่อแสดงครบ 3 สถานะตาม layout ของ Figma ไม่ใช่ผลจากการยืนยันจริง สถานะและวันเวลาเป็นตัวอย่างคงที่ ไม่มีการเปลี่ยนสถานะอัตโนมัติ

โปรเจกต์ยังไม่มี API สำหรับ match หรือหน้าที่ student ยืนยัน จึงยังไม่เชื่อมข้อมูลข้ามผู้ใช้ ปุ่ม Confirm Time กันเวลาไว้ใน IndexedDB ของเบราว์เซอร์ แต่ไม่เพิ่มการ์ดในหน้านี้เพราะยังไม่มีการยืนยันจาก student ข้อมูล Matched ตัวอย่างถูกนำไปปิดช่วงเวลาที่จองแล้วในหน้าเลือกเวลา และจัดให้แต่ละนัดไม่ซ้อนกัน เมื่อต่อ API ให้แทน `demoMatches` ใน `page.tsx` ด้วยข้อมูลของ tutor ที่ล็อกอิน และให้ backend ตรวจสิทธิ์ การยืนยันทั้งสองฝ่าย และเวลานัดซ้อนด้วย

## ตรวจสอบ

```powershell
bun run lint
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test app/tutor/matched/matches.test.mjs app/tutor/time-slot/schedule.test.mjs app/tutor/time-slot/bookings.test.mjs
```

- ESLint, TypeScript และเทสต์ 11 รายการผ่าน รวมการตรวจนัดซ้อนและทุกชุดค่าการยืนยันของทั้งสองฝ่ายในทั้ง 3 สถานะ
- HTTP ตรวจ `/tutor/matched` ได้ 200 และพบ 6 การ์ด ส่วน SVG ที่เพิ่มทั้ง 3 ไฟล์ได้ 200
- Production build ผ่านแล้วในการตรวจวันที่ 5 พฤศจิกายน 2026 รวมถึงการ build จาก cache ใหม่และ `bun run build` ด้วย Turbopack และ config เดิม ข้อผิดพลาด CSS worker ที่เคยพบไม่เกิดซ้ำในการตรวจล่าสุด แต่ยังไม่ยืนยันต้นเหตุเดิม
- ยังไม่ได้ตรวจภาพ desktop/mobile ในเบราว์เซอร์จริง: เครื่องมือ Browser Use เข้า localhost ไม่ได้ และ Computer Use หยุดเพราะยืนยัน URL ของ Edge ไม่ได้
