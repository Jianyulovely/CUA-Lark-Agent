# 复赛提交记录草稿

更新时间：2026-05-07

## 项目结果展示

### Demo 展示

当前已验证的 IM 自动化场景：

1. 在 Windows 桌面端飞书中定位目标群聊。
2. 向目标群聊发送带时间戳的唯一消息。
3. 截取发送后的聊天窗口。
4. 使用视觉模型判断目标消息是否真实出现在当前聊天窗口中。

已通过的本地兜底 smoke 运行记录：

- `runs/2026-05-06T22-43-50-205Z-im-send-message-001/report.md`
- 目标群聊：`CUA-Lark测试群`
- 验证方式：视觉模型读取发送后截图，返回结构化 JSON 结论。

已通过的 AI-first 集成运行记录：

- `runs/2026-05-06T23-31-19-475Z-ai-im-send-message/report.md`
- 运行命令：`npm run dev -- --run-ai-im-smoke --max-loop-count 1 --model-timeout-ms 60000`
- 运行结果：先自动拉起飞书；UI-TARS 视觉模型识别当前位于 `CUA-Lark测试群` 窗口并输出点击输入框动作；由于演示时将 `max-loop-count` 人为限制为 1，主 loop 触发兜底；兜底发送同一条唯一消息；最终视觉模型验收通过。
- 视觉验收结论：`The exact target message is visible in the CUA-Lark测试群 conversation.`

### 核心代码展示

主入口：

- `src/index.ts`
  - `--run-ai-im-smoke`：视觉模型优先的群聊发消息工作流。
  - `--run-im-smoke`：固定动作兜底 smoke 工作流。
  - `--run-instruction`：手动输入任务，直接驱动 UI-TARS action loop。

核心编排：

- `src/runner/ai-im-smoke-runner.ts`
  - 构造面向飞书桌面端的自然语言任务。
  - 调用 UI-TARS 视觉 action loop。
  - 截取最终界面并触发视觉验收。
  - 当视觉 action loop 失败或验收不通过时，切换到固定动作兜底。

- `src/runner/im-smoke-runner.ts`
  - 固定动作兜底：搜索群聊、打开结果、粘贴消息、回车发送。
  - 复用同一条唯一消息，便于日志、截图和验收对齐。

- `src/verifier/vision-message-verifier.ts`
  - 将最终截图送入多模态模型。
  - 要求模型只输出 `{ "passed": boolean, "reason": string }`。
  - 作为最终成功标准，而不是只相信键鼠动作执行成功。

### 项目亮点

- 保留 UI-TARS 开源项目的核心思想：由模型基于屏幕视觉状态规划下一步操作。
- 对比赛现场演示增加工程兜底：模型 action loop 若因窗口焦点、网络或模型超时失败，自动转入固定动作 smoke，确保可展示完整链路。
- 全流程产生 `events.jsonl`、截图和 `report.md`，便于复盘、录屏讲解和提交材料整理。

### AI 亮点

- 操作阶段主方案：视觉模型观察屏幕并驱动 UI-TARS action loop。
- 验收阶段：视觉模型读取最终聊天截图，判断消息是否真实出现。
- 兜底阶段只保证现场可演示，不作为 AI 能力主叙事；最终仍由视觉模型验收。

## 小组成员各自负责部分

待补充：

- 成员 A：
- 成员 B：
- 成员 C：

## 后续待补充材料

- 录制一段从桌面启动/切换到飞书、搜索群聊、发送消息、视觉验收的 Demo。
- 从通过运行中挑选关键截图放入复赛文档。
- 补充 GitHub PR、核心代码片段和测试结果截图。
