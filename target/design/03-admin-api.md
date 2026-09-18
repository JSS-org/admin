# 网页管理端 API 设计清单

范围：仅总部/门店网页管理端。第一版不创建 `/member`、`/miniapp`、`/app`、`/employee-client` 等其他端接口，也不通过通用数据接口暴露预留表。

这是前后端共同遵守的 HTTP 契约，包含后端权限、校验和业务行为；Go 内部架构另见 `04-backend-design.md`。原方案已审阅，2026-09-08 根据用户确认补充按张数分配门店优惠券额度及批量管理语义。

实现顺序：第一阶段由现有 Nitro Mock 按本契约提供接口，完成全部管理端页面联调；第二阶段 Go 实现同一路径、字段、分页、状态和错误协议，并对接第一阶段建立的 PostgreSQL。本文中的事务、真实渠道、持久任务等要求由第二阶段正式实现；第一阶段可明确模拟对应结果，但不宣称已操作真实数据库或外部渠道。

## 1. 统一协议

- 业务前缀 `/api/admin/v1`。登录相关保留现有前端路径 `/api/auth/*`、`/api/user/info`，减少对 vben 核心流程的修改。
- `Authorization: Bearer <accessToken>`；登录令牌只授权管理端；门店范围由登录账号授权实时计算，不信任请求中的角色/总部标记。
- 成功：`{ "code": 0, "data": ..., "message": "ok", "error": null }`。列表 data 为 `{ "items": [], "total": 0, "page": 1, "pageSize": 20 }`，兼容现有 Vxe 分页配置。
- 失败：使用真实 HTTP 状态，响应 `{ "code": "VALIDATION_ERROR", "data": null, "message": "参数错误", "error": "参数错误", "details": [{ "field": "name", "message": "不能为空" }] }`。error 保持字符串以兼容现有错误提示。
- HTTP：创建资源 201、普通读取/更新 200、后台任务 202、参数无效 400、未登录/会话过期 401、无操作权限 403、资源不存在/越店不可见 404、重复/状态冲突 409、上传过大 413、格式不支持 415、限流 429、渠道未配置 503、渠道失败 502、渠道超时 504。不可把所有失败都包装为 HTTP 200。
- 分页 `page`（默认1，≥1）、`pageSize`（默认20，1..100）；查询白名单 `keyword/status/storeId/from/to`，其他过滤项逐模块定义。排序字段白名单，稳定追加 id 排序。
- 日期支持 `date=YYYY-MM-DD`、`month=YYYY-MM` 或 ISO `from/to`，互斥；时间范围 `[from,to)`，按 Asia/Shanghai 转换。注册筛选用 registered_at，签到用 entered_at，财务用实际交易发生时间，避免混淆。
- uuid 校验、非空字符串去空白、长度/枚举/金额/范围限制；DTO 拒绝未知字段，路径/查询/body 均校验；数据库约束失败转换成可理解错误。SQL 参数化，不把排序或字段名直接拼入用户输入。
- 金额/比例采用字符串，如 `"199.00"`；API 不返回数据库秘密字段。文件下载由鉴权接口提供。
- 单次显式发券目标上限 500 人；礼品码单次最多 1000 个。批量额度支持全部符合条件的门店，服务端按提交时快照分段执行，不要求浏览器遍历并逐店调用。批量操作先校验全部目标权限再建任务，逐项返回执行结果；同请求重试使用 `Idempotency-Key`，变更正文复用同键返回409。
- 仅有模板/基础资料可更新；流水和签署证据没有任意修改接口。停用以 PATCH status 表达，已引用实体不硬删除。

权限标记：H=总部角色且具备对应权限；S=门店角色且具备对应权限、只能授权门店。H/S 不代表所有员工默认有权限。H/S 接口的门店数据范围统一在服务端落实。总部可跨店筛选；门店传入未授权 storeId 或关联 ID 时拒绝。工资与远程命令另设独立权限。

下列字段为主要业务入参，字段类型/可空性见数据库文档。POST 需要该实体必填字段；PATCH 只允许表中列出的可变字段，且最终实体仍须满足完整约束。创建资源返回 `id` 及资源详情，查询返回相应详情/分页列表；任务接口返回 `{id,status}`，由对应查询接口获取结果。

## 2. 登录、身份与文件

本节使用完整路径。

| 方法 | 路径 | 权限 | 入参 → 结果 / 规则 |
| --- | --- | --- | --- |
| POST | /api/auth/login | 公开，仅管理员登录 | username,password → accessToken；刷新令牌写 HttpOnly cookie，失败限流，错误不泄露账号是否存在 |
| POST | /api/auth/refresh | 刷新会话 | 刷新 cookie → data 为新 accessToken 字符串，兼容现有 baseRequestClient；轮换刷新令牌 |
| POST | /api/auth/logout | 会话 | 撤销当前会话并清除 cookie；重复退出仍成功 |
| GET | /api/auth/codes | 登录 | 返回 string[] 权限码 |
| GET | /api/user/info | 登录 | 返回现有 UserInfo 所需 userId/username/realName/avatar/roles/homePath，扩展 authorizedStores/scopeType |
| POST | /api/admin/v1/files | H/S files:upload | multipart file,category,storeId? → 文件元数据；图片/视频/合同PDF/体测报告；校验真实文件类型，限制图片10MB、PDF20MB、视频200MB（提案） |
| GET | /api/admin/v1/files/:id | H/S files:read | 返回元数据；检查文件业务归属与资源权限 |
| GET | /api/admin/v1/files/:id/content | H/S files:read | 鉴权后流式读取/下载；合同/体测按关联资源权限，不能仅凭 files:read 跨店读取 |

刷新 cookie 设置 SameSite、生产 Secure 并限定路径；登录/刷新/退出校验允许的 Origin，同源部署优先。Access token 不用固定测试令牌。

## 3. 门店、员工与权限

后续路径均相对 `/api/admin/v1`。

| 方法 | 路径 | 权限 | 主要入参 / 功能 |
| --- | --- | --- | --- |
| GET | /stores | H/S stores:read | keyword,status；S 仅授权门店 |
| POST | /stores | H stores:write | code,name,description,areaSqm,features,address,经纬度,客服信息,营业时间 |
| GET | /stores/:id | H/S stores:read | 门店详情与环境媒体 |
| PATCH | /stores/:id | H stores:write | 基本资料/status；code 不允许重用已存在门店编码 |
| PUT | /stores/:id/media | H stores:write | items[{fileId,caption,isCover,sortOrder}]；文件归属、格式及单封面校验 |
| GET | /employees | H/S employees:read | storeId,status,keyword；任职及账号状态 |
| POST | /employees | H employees:write | employeeNo,name,phone,jobTitle,hiredOn,storeAssignments；可附 username,password 建网页账号 |
| GET | /employees/:id | H/S employees:read | 员工资料；门店只见本店任职 |
| PATCH | /employees/:id | H employees:write | name,phone,jobTitle,avatarFileId,hiredOn,leftOn,status,storeAssignments,salaryAssignment；资料、门店、工资配置原子保存 |
| PUT | /employees/:id/stores | H employees:write | 兼容接口：storeAssignments[{storeId,isPrimary,isManager,joinedOn,endedOn?}]；同步校验授权范围 |
| POST | /employees/:id/account | H accounts:write | username,password；仅无账号员工可建，重复409 |
| PATCH | /accounts/:id | H accounts:write | status；停用撤销会话 |
| PUT | /accounts/:id/password | H accounts:write | password；存 scrypt 摘要、撤销已有会话 |
| GET | /roles | H roles:read | 角色分页及 scopeType |
| POST | /roles | H roles:write | code,name,scopeType,permissionCodes |
| GET | /roles/:id | H roles:read | 含权限码 |
| PATCH | /roles/:id | H roles:write | name,status；已授权角色不直接改 scopeType |
| GET | /permissions | H roles:read | 固定可授权权限清单，不提供任意创建权限 |
| PUT | /roles/:id/permissions | H roles:write | permissionCodes[]；不能授予超出操作者权限的能力 |
| GET | /accounts/:id/roles | H accounts:read | 当前角色与门店授权 |
| PUT | /accounts/:id/roles | H accounts:write | assignments[{roleId,storeId?}]；总部角色不可下发给仅有门店授权的操作者；保护最后一个有效总部管理员 |

## 4. 会员、卡种与汇总

| 方法 | 路径 | 权限 | 主要入参 / 功能 |
| --- | --- | --- | --- |
| GET | /members | H/S members:read | storeId,keyword,customerStage,date/month/from/to,cardExpiresWithinDays,courseExpiresWithinDays,hasPersonalTraining |
| POST | /members | H/S members:write | storeId,phone,name?,nickname?,gender?,birthday?；建档并建本店关联，已存在手机号须处理授权后关联而非泄露跨店资料 |
| GET | /members/:id | H/S members:read | 基本资料、本店/授权范围内持卡、私教包、到期提示、负责员工；S 不返回其他店业务数据 |
| PATCH | /members/:id | H/S members:write | name,nickname,avatarFileId,gender,birthday；S 仅可改其有权维护资料；手机号更改本版不提供 |
| GET | /members/:id/cards | H/S members:read | 持卡、门店权益、剩余次数、状态；授权店可用通卡显示必要权益 |
| GET | /members/:id/course-packs | H/S members:read | 本店/总部范围课程包、余额、到期时间 |
| GET | /card-templates | H/S cards:read | kind,status,storeId，门店只可选适用且发布的卡种 |
| POST | /card-templates | H cards:write | name,kind,durationDays?,includedUses?,price,memberPrefix?,accessScope,storeIds[] |
| GET | /card-templates/:id | H/S cards:read | 模板版本和适用门店 |
| PATCH | /card-templates/:id | H cards:write | 草稿字段或 status；已发布内容更改需创建新版本 |
| POST | /card-templates/:id/versions | H cards:write | 新版本规则；返回新id，不改变已售权益 |
| GET | /reports/performance | H/S reports:read | storeId,date/month/from/to,groupBy=store/employee；总实收净额、会员卡/私教分项、订单数、员工人均与订单均额 |
| GET | /reports/members | H/S reports:read | storeId,date/month/from/to；总会员、新增会员、潜客、临期卡/私教人数 |

会员建档不等于发卡、付费或创建会员端登录接口。网页未明确要求的手动售卡/发私教卡不额外加入。

会员详情中的 `coursePacks` 及 `/members/:id/course-packs` 每项返回 `assignedCoachId` 和 `assignedCoachName`（关联员工姓名，未分配或员工不存在时姓名为 `null`）。按课程包分别返回教练，保留离职员工的姓名；仅返回操作者有权访问的门店课程包，不要求额外的员工列表读取权限。

## 5. 签到、操课、预约、体测与上课记录

| 方法 | 路径 | 权限 | 主要入参 / 功能 |
| --- | --- | --- | --- |
| GET | /checkins | H/S checkins:read | storeId,memberId,date/from/to,status；返回入离场与方式；页面使用短间隔刷新 |
| GET | /checkins/summary | H/S checkins:read | storeId,date；入场次数/人数、昨日对比、陌生访客数分别返回 |
| GET | /course-products | H/S courses:read | storeId,kind,status；排课选择与已有私教产品查看 |
| POST | /course-products | H/S courses:write | storeId,name,kind=group,description,durationMinutes,sessionCount,price；第一版新增仅操课产品 |
| PATCH | /course-products/:id | H/S courses:write | 操课资料/status；不能修改已购权益快照；私教销售产品本版只读 |
| GET | /coaches | H/S courses:read | storeId；员工教练资料与排课选择 |
| GET | /course-sessions | H/S courses:read | storeId,coachId,from/to,status |
| POST | /course-sessions | H/S courses:write | storeId,courseProductId,coachId,room?,startsAt,endsAt,capacity；冲突返回409 |
| GET | /course-sessions/:id | H/S courses:read | 排课与名额汇总 |
| PATCH | /course-sessions/:id | H/S courses:write | room,startsAt,endsAt,capacity,status；已有预约禁止直接改关键时间/教练，取消须同步处理预约和权益 |
| GET | /bookings | H/S bookings:read | storeId,sessionId,memberId,status,from/to |
| POST | /bookings | H/S bookings:write | sessionId,memberId,memberCoursePackId?/memberCardId?,note?；管理端代预约、校验本店会员及余量 |
| PATCH | /bookings/:id | H/S bookings:write | status=cancelled,note?；取消释放预占；已签课不能取消 |
| GET | /lesson-records | H/S lessons:read | storeId,memberId,coachId,date/month/from/to；签课/签到/扣课证据只读 |
| GET | /body-measurements | H/S measurements:read | storeId,memberId,from/to |
| POST | /body-measurements | H/S measurements:write | storeId,memberId,measuredAt,各测量值,measurements?,reportFileId?,note? |
| GET | /body-measurements/:id | H/S measurements:read | 体测详情与附件 |
| PATCH | /body-measurements/:id | H/S measurements:write | 测量项/报告/note；操作者与修改时间留存，不改变会员/门店归属 |
| POST | /qr-codes | H/S courses:write | storeId,platform,sceneType=store/course,sceneId?；生成实际渠道码或已配置落地链接的二维码 |
| GET | /qr-codes | H/S courses:read | storeId,platform,sceneType；返回状态与可查看文件 |
| GET | /qr-codes/:id | H/S courses:read | 渠道码结果；未配置目标/渠道返回明确错误，不生成不可用假码 |

不开放会员扫码消费、刷脸签课、员工预约工作台、训练计划读写等接口。真实二维码渲染如需新增依赖，先说明功能必要性并征求同意；优先使用现有可用能力或渠道返回图片。

## 6. 合同与审批

| 方法 | 路径 | 权限 | 主要入参 / 功能 |
| --- | --- | --- | --- |
| GET | /contract-templates | H contracts:templates | status,applicableType |
| POST | /contract-templates | H contracts:templates | name,fileId,applicableType,reminderDays |
| PATCH | /contract-templates/:id | H contracts:templates | 草稿字段/status；发布内容不可覆盖 |
| POST | /contract-templates/:id/versions | H contracts:templates | fileId及新版本参数 |
| GET | /contracts | H/S contracts:read | storeId,memberId,status,from/to,overdue；S 仅本店 |
| GET | /contracts/:id | H/S contracts:read | 签署状态、时间、IP、设备、原件/签署件引用、事件记录 |
| POST | /contracts/:id/reminders | H/S contracts:remind | channel,content?；仅未签合同，幂等建提醒任务；渠道未配置不声称已提醒 |
| GET | /contracts/:id/reminders | H/S contracts:read | 提醒任务与实际投递状态 |
| GET | /approval-templates | H approvals:templates | businessType,status |
| POST | /approval-templates | H approvals:templates | name,businessType,steps[{stepNo,approverRoleId?/approverEmployeeId}]；顺序步骤，审批人可解析 |
| GET | /approval-templates/:id | H approvals:templates | 模板版本与步骤 |
| PATCH | /approval-templates/:id | H approvals:templates | 草稿字段/status |
| POST | /approval-templates/:id/versions | H approvals:templates | 新步骤/配置，已发起实例不受影响 |
| GET | /approvals | H/S approvals:read | storeId,businessType,status,from/to |
| GET | /approvals/:id | H/S approvals:read | 申请快照、每步审批人/意见/时间 |
| POST | /approvals/:id/decisions | H approvals:decide | decision=approve/reject,comment；总部审批管理，仅指定当前节点审批人处理，终态重复处理409 |

门店版本按用户清单仅查看审批记录；总部处理已有申请。第一版不提供教练改价申请、会员合同签署等接口，也不把查看合同扩大为管理者代签。

## 7. 黑名单、设备与器械教学

| 方法 | 路径 | 权限 | 主要入参 / 功能 |
| --- | --- | --- | --- |
| GET | /blacklists | H blacklist:read | memberId,status,keyword |
| POST | /blacklists | H blacklist:write | memberId,blockEntry,blockPurchase,reason,startsAt,endsAt? |
| PATCH | /blacklists/:id | H blacklist:write | blockEntry,blockPurchase,reason,endsAt 或 revoked=true；记录变更 |
| GET | /devices | H/S devices:read | storeId,type,status；在线状态带 lastSeenAt |
| POST | /devices | H devices:write | storeId,name,type,provider,deviceUid,model?,gatewayId?,location?,doorMode?,credentialRef? |
| GET | /devices/:id | H/S devices:read | 设备能力及柜格，返回配置脱敏 |
| PATCH | /devices/:id | H devices:write | name,location,status,连接配置引用；有记录不可改设备唯一身份/门店 |
| PUT | /devices/:id/compartments | H devices:write | compartments[{number,status}]；已占用/引用柜格不能移除 |
| POST | /devices/:id/commands | H/S devices:command | command,compartmentId?,reason；独立权限，开柜校验所属设备；Idempotency-Key必填 |
| GET | /devices/:id/commands | H/S devices:read | status,from/to；显示请求人、发送、确认、失败/超时 |
| GET | /device-commands/:id | H/S devices:read | 查询真实设备命令结果 |
| GET | /equipment | H/S equipment:read | storeId,keyword,status |
| POST | /equipment | H equipment:write | storeId,code,name,model? |
| PATCH | /equipment/:id | H equipment:write | name,model,status |
| GET | /equipment/:id/tutorials | H/S equipment:read | 教学文件与文字 |
| POST | /equipment/:id/tutorials | H equipment:write | title,fileId,instructions?,sortOrder |
| PATCH | /equipment/:id/tutorials/:tutorialId | H equipment:write | title,fileId,instructions,sortOrder,status |

第一版不开放设备事件上报、自动门禁风控或会员器械扫码读取接口。远程命令需厂商服务调用能力；无法连接时显示503或实际失败，不能直接把数据库状态改成 succeeded。

## 8. 售卡设置、包月、核销与报表

| 方法 | 路径 | 权限 | 主要入参 / 功能 |
| --- | --- | --- | --- |
| GET | /stores/:storeId/online-sales-settings | H sales:settings | 售卡方案集合 |
| PUT | /stores/:storeId/online-sales-settings | H sales:settings | offers[{cardTemplateId,salePrice,startsAt?,endsAt?,enabled,contractRequired,approvalRequired}] |
| GET | /stores/:storeId/subscription-settings | H sales:settings | 包月配置集合 |
| PUT | /stores/:storeId/subscription-settings | H sales:settings | items[{cardTemplateId,price,billingDay?,renewalNoticeDays,graceDays,enabled,contractRequired,approvalRequired}] |
| GET | /stores/:storeId/verification-settings | H sales:settings | 自助核销配置 |
| PUT | /stores/:storeId/verification-settings | H sales:settings | enabled,requireCheckin,supportedChannels,allowedStart?,allowedEnd? |
| GET | /self-service-card-orders | H/S sales:read | storeId,memberId,status,from/to；自主办卡记录（miniapp/app来源），含卡与金额 |
| GET | /self-service-card-orders/:id | H/S sales:read | 同来源限制的订单详情、卡、支付/退款状态 |
| GET | /subscriptions | H/S sales:read | storeId,memberId,status；包月协议 |
| GET | /subscriptions/:id/cycles | H/S sales:read | 每周期应付/实付、失败、关联订单 |
| GET | /verifications | H/S sales:read | storeId,memberId,type,channel,status,date/from/to |
| GET | /reports/member-cards | H/S reports:read | storeId,cardTemplateId,date/month/from/to；售出数量、实收净额、使用次数、持卡人数 |

这些记录来源由未来业务端/实际渠道写入；第一版不提供假付款、强行扣款、伪造核销结果的管理入口。

## 9. 积分、优惠券、礼品码、维护与消息

| 方法 | 路径 | 权限 | 主要入参 / 功能 |
| --- | --- | --- | --- |
| GET | /point-rules | H points:manage | eventType,status |
| POST | /point-rules | H points:manage | name,eventType,thresholdAmount?,points,dailyLimit?,effectiveFrom,effectiveTo? |
| PATCH | /point-rules/:id | H points:manage | 草稿字段/status；生效规则变更创建新版本 |
| POST | /point-rules/:id/versions | H points:manage | 新规则参数 |
| GET | /point-products | H points:manage | kind,status |
| POST | /point-products | H points:manage | name,kind,cardTemplateId?/courseProductId?,fileId?,pointsPrice,stock? |
| PATCH | /point-products/:id | H points:manage | 名称/积分价/库存/status，已兑换记录留快照 |
| GET | /point-ledger | H points:read | memberId,storeId,eventType,from/to，含余额 |
| GET | /point-redemptions | H points:read | memberId,storeId,productId,status,from/to |
| GET | /coupon-templates | H/S coupons:read | 门店只能读取可在本店发放的模板 |
| POST | /coupon-templates | H coupons:manage | name,kind,discountAmount?/discountRate?,minimumSpend,startsAt,expiresAt,totalLimit?,perMemberLimit,scope,storeIds,applicableProductType? |
| PATCH | /coupon-templates/:id | H coupons:manage | 未发放模板内容/status；已发券条款不变 |
| GET | /coupon-store-quotas | H/S coupons:read | templateId,storeId?,status；返回 allocatedCount/reservedCount/issuedCount/availableCount，S仅授权门店 |
| POST | /coupon-quota-batches | H coupons:allocate | templateId,targetMode=selected/allEligible,storeIds?[],quantityPerStore；数量为正整数张数；selected必须传门店集合，allEligible禁止同时传集合；预留总部总额后返回202批次及目标店数/总张数 |
| GET | /coupon-quota-batches | H coupons:allocate | templateId,status,from/to；总部额度批次 |
| GET | /coupon-quota-batches/:id | H coupons:allocate | 批次状态、目标/成功/失败店数、总张数、执行进度 |
| GET | /coupon-quota-batches/:id/items | H coupons:allocate | page,pageSize,status；逐店结果，避免全量大响应 |
| GET | /coupon-quota-ledger | H/S coupons:read | storeId,templateId,from/to；分配/预占/发券/释放流水 |
| POST | /coupon-batches | H/S coupons:issue | templateId,targets[{storeId,memberId}]；检查范围、每店可发张数、总限额、个人上限；总部也须明确发行门店；事务预占各店额度后返回202批次 |
| GET | /coupon-batches | H/S coupons:read | storeId,status,from/to |
| GET | /coupon-batches/:id | H/S coupons:read | 每会员成功/失败原因、已发数量 |
| GET | /member-coupons | H/S coupons:read | storeId,memberId,templateId,status；仅可见会员/本店发行关系范围 |
| POST | /gift-code-batches | H gifts:manage | name,rewardType,cardTemplateId?/courseProductId?/pointAmount,count,expiresAt；返回批次与一次性明文码下载结果 |
| GET | /gift-code-batches | H gifts:manage | status,from/to |
| GET | /gift-code-batches/:id | H gifts:manage | 掩码、领取状态、数量；不返回已丢失明文，重复请求也不再暴露明文 |
| POST | /message-batches | H/S messages:send | kind=private/bulk,storeId?,memberIds[],channel,title?,content,scheduledAt?；private 仅1位接收人 |
| GET | /message-batches | H/S messages:read | storeId,kind,status,from/to |
| GET | /message-batches/:id | H/S messages:read | 逐人投递/阅读状态；渠道没返回阅读结果则为未知 |

一键维护按用户选择的业务动作分别调用额度批次、发券批次或消息批次接口，不另建可任意修改数据的 maintenance 通用接口。`allEligible` 指提交时所有启用且属于该券适用范围的门店；后续新增店不自动加入已提交批次。示例“全部适用门店各追加100张”是每店100张，服务端返回实际店数和合计张数。分配成功只增加可发额度；发券成功才生成会员券并消耗该店额度，券核销不再次扣额度。

积分授予/兑换、礼品领取、会员收信/回信、邀请分享均只预留表，不新增其他端接口。批量管理不默认改卡期或余额。

## 10. 小程序内容、活动、加盟、评价与反馈

| 方法 | 路径 | 权限 | 主要入参 / 功能 |
| --- | --- | --- | --- |
| GET | /client-settings | H content:manage | storeId?,platform；总部默认或门店覆盖 |
| PUT | /client-settings | H content:manage | storeId?,platform,appId?,systemName,coverFileId?,welcomeText?,customerService?,appDownloadUrl?,enabled,blocks[] |
| GET | /activities | H activities:manage | storeId,status,from/to |
| POST | /activities | H activities:manage | name,description,coverFileId?,storeIds[],registrationStartsAt,registrationEndsAt,startsAt,endsAt,capacity? |
| GET | /activities/:id | H activities:manage | 活动及报名人数 |
| PATCH | /activities/:id | H activities:manage | 资料/时间/名额/status；名额不能低于有效报名数 |
| GET | /activities/:id/registrations | H activities:manage | storeId,status；只查已有报名，不替会员新增报名入口 |
| GET | /franchise-brand | H franchise:manage | 品牌与三类模型 |
| PUT | /franchise-brand | H franchise:manage | name,introduction,contactPhone,logoFileId?,models[{modelCode,name,description?,areaSqm?,investmentDescription?,fileIds}]；发布时三种模型 |
| GET | /franchise-inquiries | H franchise:manage | status,from/to,keyword |
| GET | /franchise-inquiries/:id | H franchise:manage | 咨询详情 |
| PATCH | /franchise-inquiries/:id | H franchise:manage | status；用于咨询处理，不允许更换联系人身份伪造来询 |
| GET | /reviews | H/S feedback:read | storeId,platform,rating,from/to；匿名不返回会员信息 |
| GET | /feedback | H/S feedback:read | storeId,platform,category,from/to；仅匿名内容 |
| GET | /reports/feedback | H/S feedback:read | storeId,from/to；评分分布、平均评分、评价数、匿名反馈数 |

## 11. 收款账户、分账、薪资模板与工资

| 方法 | 路径 | 权限 | 主要入参 / 功能 |
| --- | --- | --- | --- |
| GET | /payment-accounts | H settlement:manage | storeId?,provider,bindingStatus；脱敏资料 |
| GET | /payment-accounts/:id | H settlement:manage | 编辑时读取脱敏账户资料，不返回凭据引用 |
| POST | /payment-accounts | H settlement:manage | storeId?,provider,merchantId,accountName,accountDetails；账户敏感数据仅传渠道/安全保存引用 |
| PATCH | /payment-accounts/:id | H settlement:manage | accountName,credentialRef?；渠道身份变更须新建账户 |
| POST | /payment-accounts/:id/bindings | H settlement:manage | 渠道必需授权信息；返回 pending/真实绑定结果；未配置503 |
| GET | /stores/:storeId/settlement-rules | H settlement:manage | 历史与当前有效规则 |
| POST | /stores/:storeId/settlement-rules | H settlement:manage | cycleUnit,cycleValue,effectiveFrom,effectiveTo?,items[{paymentAccountId,ratio}]；合计1、账户已绑定才可发布执行 |
| PATCH | /settlement-rules/:id | H settlement:manage | 草稿字段/status；启用后改变需新版本 |
| GET | /settlements | H settlement:read | storeId,status,from/to |
| GET | /settlements/:id | H settlement:read | 分账基数、周期、接收方明细、实际到账状态 |
| GET | /salary-templates | H payroll:templates | status |
| POST | /salary-templates | H payroll:templates | name,baseSalary,effectiveFrom,effectiveTo?,rules[{component,calculationType,rate?,unitAmount?,fixedAmount?,lowerBound?,upperBound?}] |
| GET | /salary-templates/:id | H payroll:templates | 规则与版本 |
| PATCH | /salary-templates/:id | H payroll:templates | 草稿字段/status |
| POST | /salary-templates/:id/versions | H payroll:templates | 新版本规则 |
| GET | /employee-salary-assignments | H/S payroll:read | storeId,employeeId,effectiveOn |
| GET | /employee-salary-assignments/:id | H/S payroll:read | 读取本权限范围内员工薪资关联 |
| POST | /employee-salary-assignments | H payroll:templates | employeeId,storeId,templateId,effectiveFrom,effectiveTo?；有效期不重叠 |
| PATCH | /employee-salary-assignments/:id | H payroll:templates | effectiveTo；不能改已结算工资依据 |
| GET | /payrolls | H/S payroll:read | storeId,month,status |
| POST | /payrolls | H/S payroll:calculate | storeId,month；事务创建工资批次和持久任务，返回202；按员工计算，页面查询结果 |
| GET | /payrolls/:id | H/S payroll:read | 全店工资列表、每人工资组成、规则版本 |
| GET | /payrolls/:id/items/:itemId | H/S payroll:read | 员工工资与计算来源明细 |
| POST | /payrolls/:id/calculations | H/S payroll:calculate | 重算未确认批次，返回202；缺模板/冲突返回明确错误；同批次同时只允许一轮计算 |
| PATCH | /payrolls/:id | H/S payroll:confirm | status=confirmed；独立工资确认权限，确认后禁止覆盖 |

不提供资金实际划拨、工资打款入口；分账绑定只在真实渠道确认后成功。

第一阶段工资按唯一覆盖整月的已发布模板计算，不自动猜测月中换薪或入离职折算。销售规则类型为rate，消课为per_unit，固定加扣项为fixed；销售区间仅计算区间内净业绩，未配置区间时包含本月退款产生的负提成。提成金额按分截断。Mock同步完成模拟计算并返回202；Go阶段实现持久任务。

## 12. 关键业务调用示例

```http
POST /api/admin/v1/stores
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "code": "SH001",
  "name": "上海一店",
  "description": "综合健身门店",
  "areaSqm": "800.00",
  "features": ["力量训练", "操课"],
  "address": "示例地址",
  "businessHours": {"opens": "06:00", "closes": "23:00"}
}
```

```http
POST /api/admin/v1/coupon-batches
Authorization: Bearer <accessToken>
Idempotency-Key: 835cf73d-a960-4d83-ab31-ea18d455c516
Content-Type: application/json

{
  "templateId": "249958d7-644a-4773-a596-11734bca4d73",
  "targets": [{
    "storeId": "63f2522e-d981-4cf8-8836-a8b37d663d96",
    "memberId": "b4fd608a-eb1a-46aa-bff8-aefb6a5c639f"
  }]
}
```

```http
POST /api/admin/v1/coupon-quota-batches
Authorization: Bearer <accessToken>
Idempotency-Key: 25389557-2e9f-47d9-919e-85d031c31ed6
Content-Type: application/json

{
  "templateId": "249958d7-644a-4773-a596-11734bca4d73",
  "targetMode": "allEligible",
  "quantityPerStore": 100
}
```

前端业务代码放在 `apps/web-antd/src/api/<module>.ts`，由现有 requestClient 调用；页面放 `src/views/<module>/`，路由放 `src/router/routes/modules/<module>.ts`。业务列表/详情不另建重复的全局 Pinia store。按钮按权限码显示，后端仍独立验证每次请求。

## 13. 实施状态与边界

本清单是管理端可调用接口的设计，不代表已经建好数据库或完成任何真实渠道接入。原方案已获确认，一键维护语义已补齐，后续先逐模块完成前端/Mock/数据库，再实现 Go。第一阶段 Mock 仅模拟本清单中的管理端能力；仅预留的其他端实体不增设路由。
