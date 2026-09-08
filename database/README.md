# PostgreSQL 数据库

第一阶段在本地 PostgreSQL 18 的 `jss_admin_dev` 库执行 SQL；前端当前对接内存 Mock，页面修改不会写入该库。第二阶段 Go 复用这些迁移和权限定义。

已有开发库连接：`127.0.0.1:5432`，用户名 `postgres`。密码通过 `PGPASSWORD` 环境变量或 psql 交互输入，不写入仓库。PostgreSQL 安装目录为 `D:\Softwares\PostgreSQL\18`。

首次创建开发库：

```powershell
createdb -h 127.0.0.1 -p 5432 -U postgres -E UTF8 jss_admin_dev
```

执行尚未应用的迁移及初始权限：

```powershell
./database/migrate.ps1
```

需要示例门店、员工和会员时：

```powershell
./database/migrate.ps1 -SeedDevelopment
```

若当前终端还未加载 PATH，传入 `-Psql 'D:\Softwares\PostgreSQL\18\bin\psql.exe'`。每个迁移自身包在事务内，执行失败不会把该迁移标为成功；不会自动删除、重建已有数据库。初始权限和示例数据重复执行不会重复插入已有记录。

`seeds/001-permissions.sql` 是管理角色与权限初始化。`seeds/002-development.sql` 仅用于开发，示例账号 `hq`、`store1`、`store2` 的密码为 `123456`，SQL 中保存带盐的 scrypt 派生结果。不要在生产加载示例账号；生产管理员初始化将在 Go 阶段实现。

迁移按业务模块递增提交。仅在后续建表迁移中补上跨模块外键，已有 SQL 版本不回写修改。
