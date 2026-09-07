# 第一版范围核对与技术方案

依据：`target/requirements.md` 与 `target/raw/` 下 4 张原始扫描图。用户已于 2026-09-08 确认原方案，并明确一键维护为范围内批量管理、优惠券额度按券模板分配可发张数。根据用户对 Go 和约三万日活的补充，后端选型调整为 Go，并新增 `04-backend-design.md`。当前仍为设计文档，尚未实现业务功能。

## 1. 核对结论

用户整理已覆盖扫描稿“电脑系统网页版”的总部和门店功能，没有发现需要另加的网页功能。门店基本资料、活动报名、远程开门/开柜、审批与工资计算按用户明确列出的范围执行。

完整需求还包含以下数据，不能因第一版不做其他端而遗漏。除已有网页功能需要读取的数据外，以下能力只预留数据库，不新增对应其他端接口和页面：

| 原稿补充内容 | 数据设计落点 |
| --- | --- |
| 电话登录即记录潜客、会员归属分配、销售跟进 | members、member_stores、member_assignments、lead_followups |
| 教练照片简介、可预约时间、私教产品链接、改价申请、私教卡 | coach_profiles、coach_availability、course_products、product_links、price_change_requests、member_course_packs |
| 签到后扫码签课、刷脸自动签课 | bookings、lesson_records、checkins、face_events、qr_codes，签课证据互相关联 |
| 训练计划、永久运动档案、签到排名 | training_plans、training_plan_items、workout_records、body_measurements；排名按签到记录计算 |
| 一人一脸、30 秒多人报警、带人超 3 次冻结、夜间逗留、欠费限制、AB 门例外 | member_faces、face_events、access_policies、access_events、access_alerts、guest_visits、card_status_events、member_debts |
| 店长与责任教练不同入场推送范围、临期弹窗 | notification_rules、message_recipients、client_devices、expiry_reminders |
| 实时在店人数与监控画面 | access_events、store_occupancy、devices（camera），不提供会员观看接口 |
| 团购验券、微信包月、在线买卡/私教 | external_vouchers、verifications、payment_transactions、subscription_agreements、subscription_cycles |
| 邀请分享、下载 App 奖励、活动报名 | invitations、share_events、app_promotions、app_reward_claims、activity_registrations |
| 电子签署、签约 IP/设备/时间、合同提醒 | contracts、contract_events、contract_reminders、files |
| 销售明细、卡/私教分别统计、消课业绩、排名 | orders、order_items、performance_allocations、lesson_records；不提前创建冗余排名实体 |

OCR 中“建设置”“一件邀请”“发卷”等视为标题/错别字，不单独扩展功能。原稿“匿名反馈加我的会员卡信息”语义不明确：按匿名反馈与会员卡展示两个业务处理；匿名反馈的管理端不返回会员身份。

## 2. 现有代码约定

| 位置 | 现状与后续使用方式 |
| --- | --- |
| 根目录 package.json、pnpm-workspace.yaml | pnpm workspace + Turbo；沿用仓库 Node/pnpm 版本约束 |
| apps/web-antd | 使用 Ant Design Vue 的目标管理端；其他 UI 模板应用不修改 |
| src/router/routes/modules/*.ts | 自动汇入路由；按业务模块新增路由，沿用懒加载页面 |
| src/router/access.ts | 支持 vben 权限路由；第一版使用前端定义菜单 + 服务端权限码；服务端独立限制数据 |
| src/store/auth.ts | Pinia 登录、用户信息、权限码、退出流程，继续复用 |
| src/api/request.ts | RequestClient，Bearer token，code=0/data 解包，401 处理及统一错误提示 |
| src/adapter/form.ts、vxe-table.ts | 默认表单、列表、校验与分页适配可复用；不新增 UI 库 |
| apps/web-antd/vite.config.ts、.env.development | 目前 /api 代理模拟服务；实现后关闭 VITE_NITRO_MOCK，代理独立后端 |
| apps/backend-mock | README 明确数据全为模拟、未接数据库；不能作为正式持久化后端 |

未发现适用的 AGENTS.md，也未发现既有生产后端或数据库方案。开始时工作区无未提交改动。

## 3. 技术选择与必要依赖

- 前端：现有 Vue3 + TypeScript + Ant Design Vue + Pinia + vben 组件，不增加 UI、图表或工具库。
- 后端：新增 `apps/api` 独立 Go module；使用标准库 `net/http`，按 handler / service / repository / request-response struct 组织模块；构造函数显式组装依赖。
- 数据库：PostgreSQL；显式 SQL 建表与版本迁移，使用 `github.com/jackc/pgx/v5` 及其 pgxpool 参数化查询与连接池，不引入 ORM。
- 必要直接 Go 依赖为 `pgx/v5`（数据库）和 `golang.org/x/crypto` 中 scrypt（密码派生）。HTTP、JSON、日志、配置、随机令牌使用标准库；版本在实施时按工具链兼容性确定。此轮不安装依赖或修改锁文件。
- 前端继续使用原 Node/pnpm 工具链；后端使用 Go 工具链。暂不增加 Gin、Redis、消息队列服务、微服务框架、通用工作流引擎或新的开发工具。
- 认证采用 `crypto/rand` 生成随机会话令牌，数据库只保存令牌摘要；密码使用带独立盐和参数的 scrypt。前端仍按 Bearer token 调用。
- 单实例开发可使用本地上传持久目录；多实例部署前必须使用各实例共同可访问的文件存储。文件读取检查权限，合同、人脸等附件不直接暴露静态 URL；实际存储服务选择到部署时确定。
- 优惠券额度分配、发券和消息等分别使用业务批次表和 PostgreSQL 持久任务执行，显示逐项结果；事务及唯一键保证重试不重复加额度或发券。

上述依赖用于数据库连接及账号安全，属于后端必要依赖；如后续需要与业务无关的第三方库或工具，再说明必要性并征求同意。三万日活不构成必须使用 Go 的结论，容量假设、连接池及扩容边界见后端设计文档。

## 4. 第一版边界与待定业务语义

| 项目 | 提案 / 需要明确的内容 |
| --- | --- |
| 一键维护 | 已明确为授权范围内的批量业务操作；第一版覆盖批量分配门店优惠券张数、批量发券、批量消息。每项操作复用对应业务权限/校验，不提供任意表字段批量修改入口 |
| 门店优惠券额度 | 已明确按券模板可发张数计算；总部向选定门店或全部适用且启用门店追加额度，门店发券消耗额度；总部代门店发券同样计入该店额度 |
| 工资模板 | 支持底薪、会员卡销售提成、私教销售提成、消课提成、固定加扣项；规则版本与计算明细留存。实际比例由总部配置，未配置不得猜测工资 |
| 平均业绩 | 沿用已审阅口径：分别返回员工人均业绩（含零业绩有效员工）和订单均额；实收减退款，按统计期支付/退款发生日计算 |
| 通卡会员前缀 | 提案为发卡时保存“发卡门店名称 + 总部模板前缀 + 卡号”的展示快照；跨店使用不改变来源门店 |
| 连续包月、自助核销、在线售卡 | 第一版配置、查看记录；不新增会员下单、扣款授权、兑换入口 |
| 积分兑换 | 第一版总部配置规则、兑换商品、查看流水/兑换记录；会员兑换接口留待后续 |
| 合同 | 第一版上传模板、管理/查看记录、发起提醒；不提供会员签名接口。签署内容来自后续签约渠道，禁止在后台直接伪造 signed 状态 |
| 小程序/App 码 | 保存管理端生成的场景与渠道。真实小程序码需 AppID/凭证，App 码需已确定的落地链接；签课码消费接口不在第一版 |
| 私信、批量推送、未签约提醒 | 管理端创建并查询投递任务；需要消息渠道及凭证才能实际送达会员 |
| 远程开门/开柜 | 需要设备品牌/协议/网关；只有设备确认成功才显示成功，排队、超时、失败分别显示 |
| 收款账户绑定/分账 | 后台配置比例、周期、查看记录；真实账户绑定需支付渠道接入，保存配置不等于渠道绑定成功 |
| 其他端专属业务 | 训练计划上传、会员分配操作、私教链接购买/改价申请、自动门禁风控、入场推送、下载奖励等只预留数据；不因建表添加页面或接口 |

实施时需用户提供实际使用的支付/分账渠道、设备协议、消息渠道、签约渠道及小程序/App 跳转配置。无配置时返回明确“未配置”，不能用假成功代替接入。厂商回调/设备回传属于真实集成时需要另行明确的服务间接口，不在本次管理端 REST 清单中暗中增加。

## 5. 模块顺序与提交

1. 数据库完整结构、独立后端、管理员登录与角色/门店数据范围。
2. 门店、文件上传、员工与权限。
3. 会员、本店关联、会员卡种/通卡、会员详情与总部汇总。
4. 签到查询、课程安排、预约、上课记录、体测。
5. 合同模板/记录/提醒、审批模板/审批记录。
6. 设备/远程命令、器械教学、黑名单。
7. 在线售卡/包月/核销设置及记录、会员卡报表。
8. 积分、优惠券及门店额度、礼品码、批量管理与消息。
9. 活动、小程序内容、加盟信息、评价/匿名反馈。
10. 收款账户与分账设置、薪资规则及工资表。

每个模块完成后提交清晰的 git commit；文档先独立提交。每个模块做必要的接口调用和前后端联调，重点核实参数校验、门店越权与业务状态正确性；最终以真实数据库验证网页操作。不增加用户排除的额外工程流程，不做 UI 美化。

## 6. 当前决策与后续实施

原范围、数据模型和 API 方案已获确认，无需重复请求整体批准。此次同步补充 Go 后端、容量设计和门店优惠券张数额度。工资/业绩/通卡前缀沿用原已审阅方案，实际数值由总部配置；外部渠道模块实施时再补资料。

容量规划暂按三万为完整系统未来的全端日活进行情景估算；第一版仍只开发网页管理端 API。没有实测前不宣称具体机器配置已能承载该流量。
