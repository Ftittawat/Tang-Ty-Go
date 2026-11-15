<img width="1672" height="941" alt="Tang-Ty Go Coastal Adventure" src="https://github.com/user-attachments/assets/6648dce8-f959-4340-89e5-387d64b8021c" />

# Tang-Ty Go 🧳

### บอร์ดวางแผนทริป / กิจกรรมของแก๊ง แบบ Kanban

## สถานะ

| Status | ความหมาย |
| --- | --- |
| **To-Do** — อยากไป | ไอเดีย / ที่อยากไป |
| **In Progress** — กำลังวางแผน | จองตั๋ว หาที่พัก นัดวัน |
| **Ready to Go** — รอวันออกเดินทาง | แพลนเสร็จแล้ว รอถึงวันจริง (มีนับถอยหลัง) |
| **Done** — ไปมาแล้ว | เก็บเป็นความทรงจำ |

ย้ายการ์ดได้ด้วยการลากวาง (desktop), ปุ่ม “→” บนการ์ด หรือเลือกสถานะในหน้าแก้ไข

## ข้อมูลในการ์ด

Title (บังคับ), ประเภท, สถานที่, วันที่เริ่ม–สิ้นสุด, เป้าหมายคร่าวๆ (เดือน/ปี), Owner (เลือก 1 คน), ใครไปบ้าง (เลือกหลายคน), งบ (บาท/คน), ลิงก์อ้างอิง, รายละเอียด/โน้ต

รายชื่อคนในแก๊งจัดการได้ที่หน้า **ตั้งค่า** (`/settings`, ไอคอนเฟืองมุมขวาบน) — แอดมินบอร์ดเพิ่ม / แก้ชื่อ / ลบได้ และทุกคนแก้ชื่อเล่นของตัวเองได้; แก้ชื่อแล้วทุกการ์ดเปลี่ยนตาม ลบแล้วชื่อจะถูกเอาออกจากทุกการ์ด

## เข้าสู่ระบบ, บอร์ด & สิทธิ์

- เข้าสู่ระบบด้วย **Google** ได้ทุกบัญชี (Better Auth) — แต่จะยังไม่เห็นอะไรจนกว่าจะเข้าร่วมบอร์ด
- **บอร์ด** = แก๊งหนึ่งแก๊ง: ทริป แผนเที่ยว บิล และรายชื่อแยกกันในแต่ละบอร์ด — คนหนึ่งอยู่ได้หลายบอร์ด (สลับในหน้าตั้งค่า)
- **แอดมินระบบ** (อีเมลใน `ADMIN_EMAILS`): สร้างบอร์ดได้ที่ `/join` และเห็นทุกบอร์ด — เข้าร่วมบอร์ดไหนก็เป็นแอดมินของบอร์ดนั้น
- **เข้าร่วม:** แอดมินส่ง **รหัสบอร์ด** (เช่น `K7QM-3XPA`) หรือ **ลิงก์เชิญ** `/join/K7QM-3XPA` → สมาชิก login → ตั้งชื่อเล่นเอง หรือแตะเลือกชื่อที่มีอยู่แล้วในบอร์ด (ทริป/บิลเดิมของชื่อนั้นจะเป็นของเขา)
- **แอดมินบอร์ด:** ดู/คัดลอก/เปลี่ยนรหัสบอร์ด, แก้ชื่อบอร์ด, เพิ่มชื่อคนที่ไม่ใช้แอป, แก้ชื่อ/ลบ/ตั้งสิทธิ์สมาชิก — **สมาชิก:** ใช้บอร์ด แผนเที่ยว หารบิล และแก้ชื่อเล่นของตัวเองได้ในหน้าตั้งค่า
- ข้อมูลเดิมก่อนมีบอร์ดถูกย้ายเข้าบอร์ด “Tang-Ty Go” อัตโนมัติ — แอดมินระบบเห็นรหัสของบอร์ดนี้ที่ `/join`

## แผนเที่ยว (`/plans`)

กำหนดการรายวันของแต่ละทริป ลิงก์กับการ์ดทริปได้ (กด “🗺️ สร้างแผนเที่ยว” ในการ์ด จะสร้างแผนจากวันที่ของทริปให้เลย)

- **กิจกรรม:** ชื่อ, เวลาเริ่ม, เวลาสิ้นสุด, ใช้เวลา (กรอก 2 อย่างแล้วอีกอย่างคำนวณให้), สถานที่ (กดเปิด Google Maps), รายละเอียด
- **เวลาเดินทาง:** คั่นระหว่างกิจกรรมได้ (รถ / เดิน / รถไฟ / เครื่องบิน / เรือ …) + ระยะเวลา
- เว้นเวลาเริ่มว่าง = เริ่มต่อจากรายการก่อนหน้าอัตโนมัติ; ถ้ากิจกรรมที่ล็อกเวลาไว้ไปไม่ทันจะขึ้นเตือน “ไม่ทัน” และแสดงเวลาว่างเมื่อมีช่องว่าง
- จัดลำดับด้วย ↑ ↓ และย้ายข้ามวันได้ในหน้าแก้ไข

## Tech Stack

- Next.js 16
- SQLite (better-sqlite3)
- Better Auth (Google sign-in)
- Tailwind 4

## เริ่มใช้งาน

```bash
cp .env.example .env.local   # แล้วตั้ง BETTER_AUTH_SECRET, GOOGLE_*, ADMIN_EMAILS
npm install
npm run dev                  # http://localhost:3200
```

- `BETTER_AUTH_SECRET` — สุ่มด้วย `openssl rand -base64 32` (เปลี่ยนแล้วทุกคนต้อง login ใหม่)
- `BETTER_AUTH_URL` — URL ที่เข้าเว็บจริง: dev `http://localhost:3200`, production `https://<sub>.tittawat.dev`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — จาก Google Cloud Console → APIs & Services → Credentials → *OAuth client ID* (Web application)
  - **Authorized redirect URIs:** `http://localhost:3200/api/auth/callback/google` และ `https://<sub>.tittawat.dev/api/auth/callback/google`
- `ADMIN_EMAILS` — อีเมล Google ของแอดมินระบบ (สร้างบอร์ดได้) คั่นด้วย `,`
- `DATA_DIR` — (ไม่บังคับ) ที่เก็บ `app.db` ค่าเริ่มต้น `./data`

Production: `npm run build && npm start` (ใช้ `output: "standalone"`)

## Deploy ผ่าน Jenkins บน Raspberry Pi 5

Jenkins บน Pi checkout ตาม git tag → `docker build` บน Pi (arm64) → `docker compose up -d` — ข้อมูล SQLite อยู่ใน named volume `tangty-go-data` (ไม่หายตอน redeploy)

**Jenkins Credentials** (Secret text)

| Credential ID | ใช้เป็น env | ค่า |
| --- | --- | --- |
| `TANGTY_GO_BETTER_AUTH_SECRET` | `BETTER_AUTH_SECRET` | ค่าสุ่มจาก `openssl rand -base64 32` |
| `TANGTY_GO_BETTER_AUTH_URL` | `BETTER_AUTH_URL` | `https://<sub>.tittawat.dev` |
| `TANGTY_GO_GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_ID` | OAuth client ID |
| `TANGTY_GO_GOOGLE_CLIENT_SECRET` | `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `TANGTY_GO_ADMIN_EMAILS` | `ADMIN_EMAILS` | อีเมลแอดมินระบบ (สร้างบอร์ดได้) คั่นด้วย `,` |

**Pipeline job:** Pipeline script from SCM → `https://github.com/Ftittawat/Tang-Ty-Go.git`, Script Path `Jenkinsfile`

**Cloudflare Tunnel:** Zero Trust → Networks → Tunnels → tunnel เดิม → Public Hostname `<sub>.tittawat.dev` → Service `http://<pi-ip>:3200` (หรือ `http://172.17.0.1:3200`)

> cookie login ตั้ง `secure` เมื่อ `BETTER_AUTH_URL` เป็น https — ต้องเข้าผ่าน HTTPS (โดเมน tunnel) ถึงจะ login ค้างได้ เข้าตรง `http://<pi-ip>:3200` จะ login ไม่ติด

**Release**

```bash
git tag v1.0.0 && git push origin v1.0.0
```

แล้วกด *Build with Parameters* → `GIT_TAG=v1.0.0`

**ดู log / backup**

```bash
docker logs -f tangty-go
# copy ทั้งโฟลเดอร์ (app.db + -wal/-shm ของ SQLite WAL)
docker run --rm -v tangty-go-data:/data -v $PWD:/backup alpine cp -a /data /backup/tangty-go-$(date +%F)
```
