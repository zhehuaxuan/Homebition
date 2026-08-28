-- AI Agent 知识地图：新增模块概览字段
-- 创建时间：2026-08-28
-- 目的：为每个模块（M1认知层 ~ M7运维落地层）增加一段可编辑的概览描述，
--       在掌握标准明细表模块头部展示，Admin 页可编辑。
-- 说明：overview 为模块维度，但表按单元格（模块×层级）存储，因此每个 module_code 的 9 行共享同一文本。

ALTER TABLE agent_knowledge_map ADD COLUMN overview VARCHAR(500) DEFAULT NULL AFTER module_name;

-- 概览初稿（用户后续可在 Admin 页校正）
UPDATE agent_knowledge_map SET overview = '理解 AI Agent 的第一性原理与核心概念，能从 0→1 讲清 AI Agent 的基本原理，建立 AI Agent 的系统认知，能够手搓 AI Agent。' WHERE module_code = 'M1';
UPDATE agent_knowledge_map SET overview = '掌握 LLM 的能力边界与上下文窗口，能根据任务完成模型选型与能力评测，驾驭参数调优、成本治理、工具调用与多模态能力，量化模型对 Agent 行为的影响。' WHERE module_code = 'M2';
UPDATE agent_knowledge_map SET overview = '精通 Agent 的核心运行机制——ReAct、Plan-Execute、Reflection、记忆与规划循环，能从机制层面解释 Agent 如何思考、决策与自我修正，并据此选择与调优机制。' WHERE module_code = 'M3';
UPDATE agent_knowledge_map SET overview = '精通 Agent 与模型、外部世界的接口设计——Prompt 工程、Function Calling、MCP 协议、工具定义与上下文模板，能设计稳定、可复用、可演进的接口，让 Agent 可靠对接能力。' WHERE module_code = 'M4';
UPDATE agent_knowledge_map SET overview = '精通 Agent 系统架构模式——单 Agent、多 Agent、编排-执行、Hierarchical 等，能根据任务复杂度权衡选型，设计可扩展、可观测、可回退的 Agent 系统结构。' WHERE module_code = 'M5';
UPDATE agent_knowledge_map SET overview = '能独立用代码落地完整 Agent——覆盖工具注册、状态管理、Harness 工程、错误重试、流式输出、可观测埋点等工程细节，产可运行、可演进的生产级产物。' WHERE module_code = 'M6';
UPDATE agent_knowledge_map SET overview = '精通 Agent 上线运营——监控告警、评测回归、成本治理、安全合规与版本演进，能让 Agent 在真实环境稳定运行并持续迭代。' WHERE module_code = 'M7';

-- ============================================================
-- M1 认知层 L1~L9 掌握标准与时限
-- 创建时间：2026-08-28
-- 说明：criterion 为该层级掌握标准；time_bound 限时复述时限，L5~L9 为讲解/分析/创造型动作，不卡时限。
-- ============================================================

UPDATE agent_knowledge_map SET criterion = '了解 AI Agent 的基本理论、核心概念、历史演进与发展脉络、分类体系、主流框架等全景，具备AI Agent的知识广度', time_bound = '限时复述≤30min' WHERE module_code = 'M1' AND level_code = 'L1';
UPDATE agent_knowledge_map SET criterion = '能针对L1 的全部内容——理论、概念、历史、分类、框架等进行讲解，不丢项、不串味、能结合生活中的例子进行讲解', time_bound = '限时复述≤40min' WHERE module_code = 'M1' AND level_code = 'L2';
UPDATE agent_knowledge_map SET criterion = '在 L2 基础上，对 AI Agent 的理论原理有本质理解——能从第一性原理讲清 Agent 的基本原理，Why，What和How，关键技术能了解架构，能进行Demo演示', time_bound = '限时复述≤50min' WHERE module_code = 'M1' AND level_code = 'L3';
UPDATE agent_knowledge_map SET criterion = '能把 Agent 的核心组成（模型/工具/记忆/规划）与已知概念对应起来，说清各自起什么作用、彼此怎么协作', time_bound = '限时复述≤60min' WHERE module_code = 'M1' AND level_code = 'L4';
UPDATE agent_knowledge_map SET criterion = '能用第一性原理解释真实 Agent 在架构、模型选型、记忆与上下文、工具、Harness、安全、可观测性等关键设计上的选择、特点与依据', time_bound = NULL WHERE module_code = 'M1' AND level_code = 'L5';
UPDATE agent_knowledge_map SET criterion = '能基于Agent 日志等数据量化拆解一个真实 Agent 的运行机制，定位其能力边界与失效场景——说清瓶颈落在哪一环（模型能力、工具调用、记忆召回、Harness 循环、上下文管理），为什么卡在那里', time_bound = NULL WHERE module_code = 'M1' AND level_code = 'L6';
UPDATE agent_knowledge_map SET criterion = '能评判一个 Agent 设计的好坏，指出改进空间并给出方向，在架构、模型选型、记忆与上下文、工具、Harness、安全、可观测性等维度上对比不同设计路线的取舍，并能够进行应用', time_bound = NULL WHERE module_code = 'M1' AND level_code = 'L7';
UPDATE agent_knowledge_map SET criterion = '能从 0→1 手搓一个 AI Agent，能独立把模型/工具/记忆/规划四件套组装成跑得起来的整体，例如：手搓Langchain，Langgraph等', time_bound = NULL WHERE module_code = 'M1' AND level_code = 'L8';
UPDATE agent_knowledge_map SET criterion = '能从系统级思维 + 数学理论出发，原创性地提升某些 AI Agent 的能力，提升Agent的机制或范式', time_bound = NULL WHERE module_code = 'M1' AND level_code = 'L9';

-- ============================================================
-- M2 模型层 L1~L9 掌握标准与时限
-- 创建时间：2026-08-28
-- 说明：M2 更早进入动手测模型——L3 起即亲手跑模型感知能力边界。
-- ============================================================

UPDATE agent_knowledge_map SET criterion = '了解主流 LLM 全景——各家（OpenAI/Anthropic/开源等）、能力定位、上下文窗口、定价、工具调用/多模态支持、私有化/合规可行性，具备模型层知识广度', time_bound = '限时复述≤30min' WHERE module_code = 'M2' AND level_code = 'L1';
UPDATE agent_knowledge_map SET criterion = '能脱离资料复述 L1 全部内容——各家模型规格、能力边界、成本、合规约束、特性，张口能讲，不丢项', time_bound = '限时复述≤40min' WHERE module_code = 'M2' AND level_code = 'L2';
UPDATE agent_knowledge_map SET criterion = '亲手跑过主流模型，能讲清它们在真实业务任务上的能力边界——哪里强、哪里弱、为什么，而非纸面规格', time_bound = '限时复述≤50min' WHERE module_code = 'M2' AND level_code = 'L3';
UPDATE agent_knowledge_map SET criterion = '能并排对比不同模型在同一业务任务上的表现，说清差异落在能力、上下文、工具调用、多模态、成本、合规哪一维', time_bound = '限时复述≤60min' WHERE module_code = 'M2' AND level_code = 'L4';
UPDATE agent_knowledge_map SET criterion = '能从模型工程角度，针对企业场景（如内部知识问答、代码助手、客户服务）完成模型选型——说清选谁、为何不选别家、依据（能力/成本/合规/私有化/延迟/可替换性）', time_bound = NULL WHERE module_code = 'M2' AND level_code = 'L5';
UPDATE agent_knowledge_map SET criterion = '能针对企业场景设计评测集，量化模型表现——跑分、定位失效场景，说清瓶颈在能力、上下文、工具调用、多模态还是合规适配', time_bound = NULL WHERE module_code = 'M2' AND level_code = 'L6';
UPDATE agent_knowledge_map SET criterion = '能评判一个企业模型选型/调参方案的好坏，对比不同方案在能力/成本/合规/SLA/可替换性上的取舍，说清什么场景下更优', time_bound = NULL WHERE module_code = 'M2' AND level_code = 'L7';
UPDATE agent_knowledge_map SET criterion = '能从 0→1 为企业搭一套模型评测与选型体系——评测集、跑分流程、选型决策框架、可替换兜底方案，产可运行产物', time_bound = NULL WHERE module_code = 'M2' AND level_code = 'L8';
UPDATE agent_knowledge_map SET criterion = '能从系统级思维 + 数学理论出发，原创性提升模型能力——微调/对齐/新范式，而非止于用好现有模型', time_bound = NULL WHERE module_code = 'M2' AND level_code = 'L9';

-- ============================================================
-- M3 机制层 L1~L9 掌握标准与时限
-- 创建时间：2026-08-28
-- 说明：M3 聚焦 Agent 的运行机制本身（ReAct/Plan-Execute/Reflection/记忆规划循环），
--       区别于 M1 认知层（是什么）、M5 架构层（系统结构怎么组织）。L3 起动手跑机制。
-- ============================================================

UPDATE agent_knowledge_map SET criterion = '了解 Agent 核心运行机制全景——ReAct、Plan-Execute、Reflection、记忆机制、规划与工具调用循环等，具备机制层知识广度', time_bound = '限时复述≤30min' WHERE module_code = 'M3' AND level_code = 'L1';
UPDATE agent_knowledge_map SET criterion = '能脱离资料复述 L1 全部内容——各机制的原理、流程、适用场景，张口能讲，不丢项', time_bound = '限时复述≤40min' WHERE module_code = 'M3' AND level_code = 'L2';
UPDATE agent_knowledge_map SET criterion = '亲手跑过各机制的实现，能讲清每种机制在真实任务上的运转方式——如何思考、如何决策、为何这样设计', time_bound = '限时复述≤50min' WHERE module_code = 'M3' AND level_code = 'L3';
UPDATE agent_knowledge_map SET criterion = '能对比不同机制在同一任务上的表现，说清差异落在推理质量、轮次效率、工具调用稳定性、记忆利用哪一维', time_bound = '限时复述≤60min' WHERE module_code = 'M3' AND level_code = 'L4';
UPDATE agent_knowledge_map SET criterion = '能根据企业任务特点选择并调优运行机制——说清选 ReAct 还是 Plan-Execute、为何、记忆与规划怎么配、依据是什么', time_bound = NULL WHERE module_code = 'M3' AND level_code = 'L5';
UPDATE agent_knowledge_map SET criterion = '能基于运行日志量化拆解某机制在真实任务上的表现——定位失效场景，说清瓶颈在推理、规划、记忆还是工具循环', time_bound = NULL WHERE module_code = 'M3' AND level_code = 'L6';
UPDATE agent_knowledge_map SET criterion = '能评判一个机制选型/调优方案的好坏，对比不同机制在质量/效率/稳定性/成本上的取舍，说清什么场景下更优', time_bound = NULL WHERE module_code = 'M3' AND level_code = 'L7';
UPDATE agent_knowledge_map SET criterion = '能从 0→1 实现并改进一种运行机制——例如手搓 ReAct 循环、Plan-Execute 调度器或 Reflection 自修正模块，产可运行产物', time_bound = NULL WHERE module_code = 'M3' AND level_code = 'L8';
UPDATE agent_knowledge_map SET criterion = '能从系统级思维 + 数学理论出发，原创性提出新的运行机制或范式——而非止于复现已有', time_bound = NULL WHERE module_code = 'M3' AND level_code = 'L9';

-- ============================================================
-- M4 接口层 L1~L9 掌握标准与时限
-- 创建时间：2026-08-28
-- 说明：M4 聚焦 Agent 与模型、外部世界的接口设计——Prompt 工程、Function Calling、
--       MCP 协议、工具定义与上下文模板。区别于 M6 实现层（写代码落地）。
-- ============================================================

UPDATE agent_knowledge_map SET criterion = '了解 Agent 接口设计全景——Prompt 工程、Function Calling、MCP 协议、工具定义、上下文模板等，具备接口层知识广度', time_bound = '限时复述≤30min' WHERE module_code = 'M4' AND level_code = 'L1';
UPDATE agent_knowledge_map SET criterion = '能脱离资料复述 L1 全部内容——各接口/协议的原理、结构、适用场景，张口能讲，不丢项', time_bound = '限时复述≤40min' WHERE module_code = 'M4' AND level_code = 'L2';
UPDATE agent_knowledge_map SET criterion = '亲手写过 Prompt、Function Calling、MCP 工具定义，能讲清每种接口在真实任务上如何影响 Agent 对接外部能力', time_bound = '限时复述≤50min' WHERE module_code = 'M4' AND level_code = 'L3';
UPDATE agent_knowledge_map SET criterion = '能对比不同接口方案在同一任务上的表现，说清差异落在稳定性、可复用性、可演进性、token 成本哪一维', time_bound = '限时复述≤60min' WHERE module_code = 'M4' AND level_code = 'L4';
UPDATE agent_knowledge_map SET criterion = '能针对企业场景设计稳定可复用的接口方案——Prompt 模板、工具定义、MCP 接入，说清为何这样设计、依据是什么', time_bound = NULL WHERE module_code = 'M4' AND level_code = 'L5';
UPDATE agent_knowledge_map SET criterion = '能基于调用日志量化拆解接口在真实任务上的表现——定位失效场景，说清瓶颈在 Prompt、工具定义、协议适配还是上下文模板', time_bound = NULL WHERE module_code = 'M4' AND level_code = 'L6';
UPDATE agent_knowledge_map SET criterion = '能评判一个接口设计方案的好坏，对比不同方案在稳定性/可复用性/可演进性/成本上的取舍，说清什么场景下更优', time_bound = NULL WHERE module_code = 'M4' AND level_code = 'L7';
UPDATE agent_knowledge_map SET criterion = '能从 0→1 设计并实现一套接口规范——例如企业级工具定义库、Prompt 模板体系或 MCP 服务，产可运行产物', time_bound = NULL WHERE module_code = 'M4' AND level_code = 'L8';
UPDATE agent_knowledge_map SET criterion = '能从系统级思维 + 数学理论出发，原创性提出新的接口范式或协议——而非止于用好已有', time_bound = NULL WHERE module_code = 'M4' AND level_code = 'L9';

-- ============================================================
-- M5 架构层 L1~L9 掌握标准与时限
-- 创建时间：2026-08-28
-- 说明：M5 聚焦 Agent 系统架构模式与结构组织——单 Agent、多 Agent、编排-执行、
--       Hierarchical 等。区别于 M3 机制层（单个 Agent 怎么转）、M6 实现层（写代码）。
-- ============================================================

UPDATE agent_knowledge_map SET criterion = '了解 Agent 系统架构模式全景——单 Agent、多 Agent、编排-执行、Hierarchical、群体智能等，具备架构层知识广度', time_bound = '限时复述≤30min' WHERE module_code = 'M5' AND level_code = 'L1';
UPDATE agent_knowledge_map SET criterion = '能脱离资料复述 L1 全部内容——各架构模式的原理、结构、适用场景，张口能讲，不丢项', time_bound = '限时复述≤40min' WHERE module_code = 'M5' AND level_code = 'L2';
UPDATE agent_knowledge_map SET criterion = '亲手搭过不同架构的 Agent 系统，能讲清每种架构在真实任务上如何组织——组件如何分工、如何通信、为何这样组', time_bound = '限时复述≤50min' WHERE module_code = 'M5' AND level_code = 'L3';
UPDATE agent_knowledge_map SET criterion = '能对比不同架构在同一业务任务上的表现，说清差异落在可扩展性、可观测性、可回退性、成本、复杂度哪一维', time_bound = '限时复述≤60min' WHERE module_code = 'M5' AND level_code = 'L4';
UPDATE agent_knowledge_map SET criterion = '能根据企业任务复杂度权衡架构选型——说清选单 Agent 还是多 Agent、编排怎么设计、依据是什么（扩展性/可观测/可回退/成本）', time_bound = NULL WHERE module_code = 'M5' AND level_code = 'L5';
UPDATE agent_knowledge_map SET criterion = '能基于系统日志量化拆解某架构在真实任务上的表现——定位瓶颈，说清卡在组件通信、任务分发、状态同步还是故障回退', time_bound = NULL WHERE module_code = 'M5' AND level_code = 'L6';
UPDATE agent_knowledge_map SET criterion = '能评判一个架构选型方案的好坏，对比不同架构在可扩展性/可观测性/可回退性/成本/复杂度上的取舍，说清什么场景下更优', time_bound = NULL WHERE module_code = 'M5' AND level_code = 'L7';
UPDATE agent_knowledge_map SET criterion = '能从 0→1 设计并实现一套企业级 Agent 架构——例如多 Agent 编排平台、可回退的容错结构，产可运行产物', time_bound = NULL WHERE module_code = 'M5' AND level_code = 'L8';
UPDATE agent_knowledge_map SET criterion = '能从系统级思维 + 数学理论出发，原创性提出新的架构范式——而非止于复现已有', time_bound = NULL WHERE module_code = 'M5' AND level_code = 'L9';

-- ============================================================
-- M6 实现层 L1~L9 掌握标准与时限
-- 创建时间：2026-08-28
-- 说明：M6 聚焦用代码落地完整 Agent——工具注册、状态管理、Harness 工程、错误重试、
--       流式输出、可观测埋点等工程细节。区别于 M3/M4/M5（设计与原理）。
-- ============================================================

UPDATE agent_knowledge_map SET criterion = '了解 Agent 工程实现全景——工具注册、状态管理、Harness 工程、错误重试、流式输出、可观测埋点等，具备实现层知识广度', time_bound = '限时复述≤30min' WHERE module_code = 'M6' AND level_code = 'L1';
UPDATE agent_knowledge_map SET criterion = '能脱离资料复述 L1 全部内容——各工程环节的原理、实现要点、适用场景，张口能讲，不丢项', time_bound = '限时复述≤40min' WHERE module_code = 'M6' AND level_code = 'L2';
UPDATE agent_knowledge_map SET criterion = '亲手写过各工程环节的实现，能讲清每个环节在真实代码里如何落地——工具怎么注册、状态怎么管、流式怎么接', time_bound = '限时复述≤50min' WHERE module_code = 'M6' AND level_code = 'L3';
UPDATE agent_knowledge_map SET criterion = '能对比不同实现方案在同一环节上的表现，说清差异落在健壮性、性能、可维护性、可观测性哪一维', time_bound = '限时复述≤60min' WHERE module_code = 'M6' AND level_code = 'L4';
UPDATE agent_knowledge_map SET criterion = '能针对企业场景落地 Agent 的工程实现——说清工具注册、状态管理、Harness、重试、流式、埋点各自怎么写、依据是什么', time_bound = NULL WHERE module_code = 'M6' AND level_code = 'L5';
UPDATE agent_knowledge_map SET criterion = '能基于运行日志量化拆解实现层在真实任务上的表现——定位瓶颈，说清卡在工具注册、状态管理、Harness 循环还是重试/流式', time_bound = NULL WHERE module_code = 'M6' AND level_code = 'L6';
UPDATE agent_knowledge_map SET criterion = '能评判一个工程实现方案的好坏，对比不同方案在健壮性/性能/可维护性/可观测性/成本上的取舍，说清什么场景下更优', time_bound = NULL WHERE module_code = 'M6' AND level_code = 'L7';
UPDATE agent_knowledge_map SET criterion = '能从 0→1 手搓一个生产级 Agent——覆盖工具注册、状态管理、Harness、错误重试、流式输出、可观测埋点，例如手搓一个可运行的 Agent 框架', time_bound = NULL WHERE module_code = 'M6' AND level_code = 'L8';
UPDATE agent_knowledge_map SET criterion = '能从系统级思维 + 数学理论出发，原创性提升 Agent 工程实现能力——提出新的工程范式或底层机制，而非止于复现已有', time_bound = NULL WHERE module_code = 'M6' AND level_code = 'L9';

-- ============================================================
-- M7 运维落地层 L1~L9 掌握标准与时限
-- 创建时间：2026-08-28
-- 说明：M7 聚焦 Agent 上线运营——监控告警、评测回归、成本治理、安全合规、版本演进。
--       注意：评测在此偏上线后的回归与持续评测，区别于开发期的评测设计（散见 M2/M3）。
-- ============================================================

UPDATE agent_knowledge_map SET criterion = '了解 Agent 运维落地全景——监控告警、评测回归、成本治理、安全合规、版本演进等，具备运维层知识广度', time_bound = '限时复述≤30min' WHERE module_code = 'M7' AND level_code = 'L1';
UPDATE agent_knowledge_map SET criterion = '能脱离资料复述 L1 全部内容——各运维环节的原理、指标、工具、适用场景，张口能讲，不丢项', time_bound = '限时复述≤40min' WHERE module_code = 'M7' AND level_code = 'L2';
UPDATE agent_knowledge_map SET criterion = '亲手配置过监控、告警、评测回归等运维环节，能讲清每个环节在真实 Agent 上如何运转——看什么指标、怎么触发、如何闭环', time_bound = '限时复述≤50min' WHERE module_code = 'M7' AND level_code = 'L3';
UPDATE agent_knowledge_map SET criterion = '能对比不同运维方案在同一环节上的表现，说清差异落在覆盖度、灵敏度、误报率、成本哪一维', time_bound = '限时复述≤60min' WHERE module_code = 'M7' AND level_code = 'L4';
UPDATE agent_knowledge_map SET criterion = '能针对企业 Agent 场景落地运维方案——监控告警、评测回归、成本治理、安全合规，说清各自怎么做、依据是什么', time_bound = NULL WHERE module_code = 'M7' AND level_code = 'L5';
UPDATE agent_knowledge_map SET criterion = '能基于运维数据量化拆解 Agent 在生产环境的表现——定位风险与退化，说清瓶颈在监控覆盖、评测回归、成本异常还是安全合规', time_bound = NULL WHERE module_code = 'M7' AND level_code = 'L6';
UPDATE agent_knowledge_map SET criterion = '能评判一个运维方案的好坏，对比不同方案在稳定性/灵敏度/成本/合规上的取舍，说清什么场景下更优', time_bound = NULL WHERE module_code = 'M7' AND level_code = 'L7';
UPDATE agent_knowledge_map SET criterion = '能从 0→1 搭建一套企业级 Agent 运维体系——监控告警平台、评测回归流水线、成本与安全治理框架，产可运行产物', time_bound = NULL WHERE module_code = 'M7' AND level_code = 'L8';
UPDATE agent_knowledge_map SET criterion = '能从系统级思维 + 数学理论出发，原创性提升 Agent 运维能力——提出新的运维范式或机制，而非止于复现已有', time_bound = NULL WHERE module_code = 'M7' AND level_code = 'L9';
