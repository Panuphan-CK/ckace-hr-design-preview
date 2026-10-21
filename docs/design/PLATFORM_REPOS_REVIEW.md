# ผลอ่าน GitHub โปรเจกต์อื่น + Handoff แพลตฟอร์มบริษัท (2026-10-15)

> **Historical design evidence — updated authority 2026-10-21:** เอกสารนี้เก็บผลวิเคราะห์ ณ วันที่ 2026-10-15 เท่านั้น ไม่ใช่สถานะปัจจุบันของโปรเจกต์ ปัจจุบัน TEST baseline คือ **TESTm67**, TASK-39.9 คือ Desktop track ที่ active, Codex Local เป็นตัวทำงานปัจจุบันร่วมกับ Claude แบบ handoff และ Project A / APP_Leave ถูกยกเลิกจาก active planning แล้ว

แหล่ง: `Panuphan-CK/app-audit`, `Panuphan-CK/ckrpa` (อ่านผ่าน GitHub API เฉพาะ README/คู่มือ/ไฟล์ API หลัก ไม่ได้ clone ทั้ง repo
และไม่คัดลอกข้อมูลลูกค้า), และไฟล์ `CODEX_HANDOFF_COMPANY_PLATFORM.md` ที่ Owner แนบ

## 1) สิ่งที่พบ
| โปรเจกต์ | คืออะไร | เทคโนโลยี | เกี่ยวกับ HR / ฐานข้อมูลพนักงานอย่างไร |
|---|---|---|---|
| `ckace-hr` (Project B) | HR ใหม่ (ลา, OT, ลงเวลา, ค่ารักษา, อนุมัติ) | Next.js + NestJS + Prisma + Neon (PostgreSQL) + R2 | เป็นฐานข้อมูลพนักงานของแพลตฟอร์ม |
| `app-audit` | เครื่องมือสอบบัญชี: ลูกค้า, นำเข้างบทดลอง, จับคู่ผังบัญชี DBD, สร้างงบการเงิน, รายงานผู้สอบบัญชี (CPA/TA), AI จับคู่บัญชี (Gemini), สำรอง/กู้คืน | Google Apps Script + Sheets/Drive + Tailwind | มี "รายชื่อผู้สอบบัญชี CPA/TA" เป็นข้อมูลบุคคลของตัวเอง → ควรอ้างพนักงาน (บทบาทวิชาชีพ) แทนสำเนาแยก; ตั้งค่า (Folder/Sheet ID, API key) เก็บในหน้าตั้งค่า |
| `ckrpa` | โปรแกรม RPA ดาวน์โหลด/ยื่นแบบ: RD (กรมสรรพากร), SSO (ประกันสังคม), TFAC, DBD, FlowAccount, ภ.พ.30/36, ภ.ง.ด.54 | Python, ตัวโปรแกรม .exe (Windows) + เซิร์ฟเวอร์ API (Flask บน PythonAnywhere) พร้อมระบบ License | มีผู้ใช้/เซสชันของตนเอง (`users.json`, `sessions.json`) → ควรใช้ตัวตนจากแพลตฟอร์ม; มีตัวกลางรหัสผ่าน FlowAccount (credential lease) |

## 2) ความเสี่ยงที่เห็น (ไม่คัดลอกค่า)
- `ckrpa/api_server.py`: คีย์เข้ารหัสและคีย์แอดมินมี **ค่า fallback เริ่มต้นในโค้ด** ถ้าไม่ตั้ง environment จะใช้ค่าที่ทุกคนเดาได้ — ต้องบังคับตั้งค่าและล้มเมื่อไม่มี
- `ckrpa`: ผู้ใช้/เซสชันเก็บเป็นไฟล์ JSON บนเซิร์ฟเวอร์เดียว ไม่มีธุรกรรมจริง (ใช้ล็อกไฟล์) และไม่เชื่อมสิทธิ์กับ HR (คนลาออกยังเข้าได้ถ้าไม่ลบด้วยมือ)
- `app-audit` และ Project A (GAS): ค่าตั้งต้นและ API key อยู่ในหน้าตั้งค่า/Script Properties/โค้ดฟังก์ชัน setup — ต้องย้ายเข้า Secret Manager เมื่อย้ายระบบ
- ข้อมูลลูกค้าและเอกสารจริงอยู่ใน Drive/Sheets ของระบบเดิม (ตามที่ตกลงแล้ว: ไม่คอมมิตข้อมูลลูกค้า)
- ยังไม่ได้สแกนทั้ง repo หา secret; ต้องทำเป็นงานแยกก่อนเชื่อมระบบ

## 3) เทียบ Handoff กับแนวที่ Project B ล็อกไว้ (AGENTS.md)
| หัวข้อ | Handoff | Project B ปัจจุบัน | ข้อเสนอ |
|---|---|---|---|
| โดเมน | `app.company.com` + เส้นทาง `/hr`,`/office`,`/audit` | ผลิต `hr.ckaceaccount.com`, ทดสอบ `hr-test.ckaceaccount.com`, `app.ckaceaccount.com` สงวนไว้สำหรับพอร์ทัลแพลตฟอร์ม | ใช้ `app.ckaceaccount.com` เป็นเปลือก/ตัวสลับโมดูล เส้นทาง `/hr` ชี้ไปที่บริการ HR (Firebase Hosting rewrite) ระหว่างนั้นคง `hr.…` ไว้ ไม่เปลี่ยนโดเมน Production โดยไม่ขออนุมัติ |
| ฐานข้อมูล | Cloud SQL (แนะนำ) | Neon PostgreSQL (V0) | คงตามที่ล็อก (Neon) จนมีเหตุผล/การอนุมัติ; ออกแบบ schema ให้ย้ายได้ |
| โครงสร้าง repo | monorepo เดียว (`apps/`,`packages/`,`workers/`) | repo HR แยก | เก็บ `ckace-hr` เป็นแกนแพลตฟอร์ม + HR; แพ็กเกจร่วม (สัญญา/สิทธิ์) แยกเป็น `packages/` เดิม; โมดูล Office/Audit เพิ่มทีหลังใน monorepo เดียวกันหรือ repo แยกตามการตัดสินใจ ADR |
| Schema | `core/office/audit/hr/...` | schema เดียว (`public`) | ใช้ Postgres schema แยกเมื่อเพิ่มโมดูล; ตอนนี้ HR ยังไม่ต้องย้ายชื่อตาราง |
| ผู้ใช้/สิทธิ์ | `core.users/organizations/memberships/roles/permissions` | `UserAccount/Role/Permission/UserRole` + Agency (ไม่มีบริษัท) | เพิ่ม `Company` + `RoleAssignment` มีขอบเขต (ดู ORG_MODEL_AND_ACCESS.md) ซึ่งตรงกับ `organization_memberships` ของ Handoff |
| ชื่อสิทธิ์ | `module.resource.action` | มีคีย์สิทธิ์แล้ว (เช่น `calendar.leave.read`) | ตรงกันอยู่แล้ว; ตรวจให้ชื่อสม่ำเสมอ |
| Audit log | ชั้นหนึ่งของระบบ | มี `AuditLog` | ใช้ต่อ เพิ่มฟิลด์ before/after, request id, IP ตามที่ Handoff ระบุ |
| RPA | ห่อด้วย worker + คิว + งานสถานะ | ยังไม่มี | ขั้นหลังจาก HR; ใช้บัญชีบริการและ Secret Manager |
| ความรับผิดชอบ | เดิมเขียนสำหรับ Codex | **Historical only:** รูปแบบแบ่ง Claude/Project B และ Codex/Project A ถูกยกเลิกแล้ว | ใช้ Collaborative Codex + Claude บน CKACE_HR; Project A ไม่อยู่ใน active planning |

## 4) ลำดับความสำคัญ (Owner สั่ง: ระบบลาก่อนเป็นอันดับแรก)
ตรงกับ Phase 2 ของ Handoff และงานที่ทำอยู่แล้ว ลำดับ "ระบบลา" ให้เสร็จก่อนแตะระบบอื่น:
1. โครงสร้างบริษัท/ขอบเขตบทบาท/ผู้บังคับบัญชา + ตัวคำนวณสายอนุมัติ (ใช้ได้ทั้งลา/OT/แก้ไขเวลา/ค่ารักษา)
2. ลา: ส่งกลับให้แก้ไข-ส่งใหม่, ยกเลิกใบที่อนุมัติแล้ว (ระดับสูงสุด), สิทธิ์ตามอายุงาน (กฎเสร็จ), ลาพิเศษเปิดรายบุคคล
3. OT: เวลาพัก (เสร็จ), ค่าข้าว/ค่าเดินทาง (กฎเสร็จ) + รายงาน .xlsx
4. หน้าตาตามแบบ v18 ที่เหลือ (ปฏิทิน, รายงาน, ตั้งค่า, โปรไฟล์) ใช้ข้อมูลจริง
5. แจ้งเตือน (อีเมล/LINE/ในแอป) + นโยบายเตือนค้าง
6. ย้ายข้อมูล: dry run + กระทบยอด → คู่ขนาน → ตัดสลับ (ต้องได้รับอนุมัติ Owner ตอนลงมือ)
หลังระบบลา: เพิ่มบทบาทวิชาชีพของพนักงานเพื่อให้ Office/Audit/RPA อ้างอิง แล้วเชื่อมทีละระบบ

## 5) สัญญาที่ระบบอื่นจะอ่านจาก HR (ร่างแรก)
- `GET /api/platform/employees?updatedSince=` : id (UUID), รหัสแสดงผล, ชื่อ, บริษัท, ทีม, สถานะ (ACTIVE/RESIGNED), บทบาทวิชาชีพ (`BOOKKEEPER`, `RESPONSIBLE`, `AUDITOR`), ทะเบียนวิชาชีพ (ถ้ามี)
- เหตุการณ์: `employee.created|updated|resigned`, `team.changed`
- ตรวจตัวตน/สิทธิ์ผ่านโทเค็นของแพลตฟอร์ม (ไม่ใช้ฐานรหัสผ่านแยกของแต่ละเครื่องมือ)
- บัญชีบริการสำหรับ RPA: สิทธิ์ขั้นต่ำ หมุนเวียนคีย์ได้ มี audit
