# Tang-Ty Go 🧳

บอร์ดวางแผนทริป / กิจกรรมของแก๊ง แบบ Kanban — Next.js 16 + SQLite (better-sqlite3) + Tailwind 4

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

รายชื่อคนในแก๊งจัดการได้ที่หน้า **ตั้งค่า** (`/settings`, ไอคอนเฟืองมุมขวาบน) — เพิ่ม / แก้ชื่อ / ลบ; แก้ชื่อแล้วทุกการ์ดเปลี่ยนตาม ลบแล้วชื่อจะถูกเอาออกจากทุกการ์ด

## แผนเที่ยว (`/plans`)

กำหนดการรายวันของแต่ละทริป — ลิงก์กับการ์ดทริปได้ (กด “🗺️ สร้างแผนเที่ยว” ในการ์ด จะสร้างแผนจากวันที่ของทริปให้เลย)

- **กิจกรรม:** ชื่อ, เวลาเริ่ม, เวลาสิ้นสุด, ใช้เวลา (กรอก 2 อย่างแล้วอีกอย่างคำนวณให้), สถานที่ (กดเปิด Google Maps), รายละเอียด
- **เวลาเดินทาง:** คั่นระหว่างกิจกรรมได้ (รถ / เดิน / รถไฟ / เครื่องบิน / เรือ …) + ระยะเวลา
- เว้นเวลาเริ่มว่าง = เริ่มต่อจากรายการก่อนหน้าอัตโนมัติ; ถ้ากิจกรรมที่ล็อกเวลาไว้ไปไม่ทันจะขึ้นเตือน “ไม่ทัน” และแสดงเวลาว่างเมื่อมีช่องว่าง
- จัดลำดับด้วย ↑ ↓ และย้ายข้ามวันได้ในหน้าแก้ไข

## เริ่มใช้งาน

```bash
cp .env.example .env.local   # แล้วตั้ง APP_PASSWORD
npm install
npm run dev                  # http://localhost:3200
```

- `APP_PASSWORD` — รหัสผ่านเดียวที่ทุกคนใช้เข้าเว็บ (session อยู่ได้ 30 วัน)
- `AUTH_SECRET` — (ไม่บังคับ) ใช้เซ็น cookie; ถ้าไม่ตั้งจะใช้ `APP_PASSWORD` — เปลี่ยนรหัสแล้วทุกคนต้อง login ใหม่
- `DATA_DIR` — (ไม่บังคับ) ที่เก็บ `app.db` ค่าเริ่มต้น `./data`

Production: `npm run build && npm start` (ใช้ `output: "standalone"`)

## Deploy ผ่าน Jenkins บน Raspberry Pi 5

Jenkins บน Pi checkout ตาม git tag → `docker build` บน Pi (arm64) → `docker compose up -d` — ข้อมูล SQLite อยู่ใน named volume `tangty-go-data` (ไม่หายตอน redeploy)

**Jenkins Credentials** (Secret text)

| Credential ID | ใช้เป็น env | ค่า |
| --- | --- | --- |
| `TANGTY_GO_APP_PASSWORD` | `APP_PASSWORD` | รหัสผ่านเข้าเว็บที่แชร์ให้แก๊ง |

**Pipeline job:** Pipeline script from SCM → `https://github.com/Ftittawat/Tang-Ty-Go.git`, Script Path `Jenkinsfile`

**Cloudflare Tunnel:** Zero Trust → Networks → Tunnels → tunnel เดิม → Public Hostname `<sub>.tittawat.dev` → Service `http://<pi-ip>:3200` (หรือ `http://172.17.0.1:3200`)

> cookie login ตั้ง `secure` ใน production — ต้องเข้าผ่าน HTTPS (โดเมน tunnel) ถึงจะ login ค้างได้ เข้าตรง `http://<pi-ip>:3200` จะ login ไม่ติด

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
