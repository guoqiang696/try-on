# OPC 智能试衣平台

这个仓库包含一套前后端职责分离的换装平台：

- `frontend/`：唯一的前端源码，包含单页应用、页面片段和静态资源。
- `backend/`：平台 FastAPI 后端，按路由、业务服务、数据库、安全和配置拆分。
- `workflow_service/`：独立的换装工作流服务，对接 ComfyUI 面板。
- `app.py`、`service.py`：兼容启动入口，原有 Uvicorn 命令无需修改。

## 项目结构

```text
.
├── backend/
│   ├── routers/          # HTTP 接口
│   ├── services/         # 积分与试衣业务逻辑
│   ├── config.py         # 环境配置
│   ├── database.py       # 数据库连接与初始化
│   ├── security.py       # 密码与 Token
│   └── main.py           # FastAPI 应用装配
├── frontend/
│   ├── index.html
│   └── shared/
├── workflow_service/
│   └── main.py
├── tests/
├── app.py
└── service.py
```

## 远程 PostgreSQL

平台默认连接 `42.192.112.233:5432` 上的 PostgreSQL。推荐先在远程数据库中创建用户和数据库：

```sql
CREATE USER opc WITH PASSWORD 'your_password';
CREATE DATABASE opc_tryon OWNER opc;
GRANT ALL PRIVILEGES ON DATABASE opc_tryon TO opc;
```

应用启动时会自动创建业务表，并写入演示账号：

- 邮箱：`demo@opc.local`
- 密码：`demo123`

## 启动平台后端

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app:app --host 0.0.0.0 --port 8000
```

在 `.env` 中设置真实数据库密码：

```env
DATABASE_URL=postgresql://opc:your_password@42.192.112.233:5432/opc_tryon
TRYON_SERVICE_URL=http://42.192.112.233:8008
OPC_SECRET_KEY=replace-with-a-long-random-secret
```

浏览器打开：

```text
http://127.0.0.1:8000
```

## 主要接口

- `POST /api/auth/register`：注册并返回 token。
- `POST /api/auth/login`：登录并返回 token。
- `GET /api/me`：当前用户。
- `GET /api/profile`：个人中心统计、积分和最近任务。
- `POST /api/tryon/jobs`：创建生成任务，支持 `multipart/form-data` 上传图片；`model`/`real` 调用双图试穿，`free` 调用单图编辑。
- `GET /api/tryon/jobs/{job_id}`：查询任务并按模式轮询远程生成结果。
- `GET /api/gallery`：作品库。
- `POST /api/gallery/{result_id}/favorite`：收藏/取消收藏。
- `POST /api/credits/recharge`：积分充值。

## 换装服务

平台后端通过 `TRYON_SERVICE_URL` 调用现有换装服务，默认是：

```text
http://42.192.112.233:8008
```

独立启动仓库内的工作流服务：

```bash
uvicorn service:app --host 0.0.0.0 --port 8008
```

联调前端和数据库但暂时不调用模型时，可以设置：

```env
OPC_MOCK_TRYON=true
```

## 验证

```bash
python -m unittest discover -s tests -v
```
