# Overview text compared with admin-overview.html

Owner decision: use reference wording when it describes the same real data; hide unsupported cards. The reference contains sample figures and names and is not a data source.

| Reference wording | Desktop overview treatment | Reason |
| --- | --- | --- |
| หน้าแรก, การลา, OT, ค่ารักษาพยาบาล, ลงเวลา, รายงาน | Use identical wording for matching destinations on the overview. | The existing destinations have the same meaning and remain capability-gated. |
| ค้นหาในระบบ | Use as the overview placeholder; accessible label still states it is unavailable. | The field has no search handler. |
| แดชบอร์ดผู้ดูแล | Use for the management-capable view; employee view uses แดชบอร์ดพนักงาน. | The heading follows the existing role distinction. |
| มาทำงาน, มาสาย, ลา, รออนุมัติ, OT (ชม.), ค่ารักษา, สมัครใหม่, แก้เวลา | Do not relabel the personal entitlement cards with these organization-wide metric titles. | Current overview data does not provide the corresponding totals. |
| สถานะพนักงาน, ภาพรวมการเข้างาน, ลงเวลาเข้า/ออก, รออนุมัติ, พนักงานแยกตามฝ่าย, กิจกรรมล่าสุด, วันสำคัญ | Hide these reference cards. | Current overview does not provide the necessary scoped data; see NEEDS_LOGIC_LATER.md. |
| ส่งออก, เพิ่มวันหยุด, ไปหน้ารออนุมัติ, ดูทั้งหมด, อนุมัติ | Do not add these sample actions. | The Owner excluded quick links and requested no new behavior. Existing navigation and request links remain available. |
| ยินดีต้อนรับ and sample employee names, dates and figures | Do not reproduce as a HERO or fixed values. | HERO was explicitly removed and actual data must not be fabricated. |

Personal leave, request, team-calendar and announcement labels remain descriptive of their real data; they have no equivalent card in this admin mock-up.
