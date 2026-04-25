# KanaSnap

[English](./README.md)

一个用于学习日语假名（平假名和片假名）的交互式 PWA，提供五十音图、测验、工具和学习分析功能。

## 功能特性

- **五十音图** — 浏览完整的清音、浊音、半浊音和拗音，支持平假名、片假名与对照显示模式
- **测验** — 加权测验引擎会优先练习常错假名，支持键盘快捷键和自动切题
- **学习** — 无限滚动的假名学习流，包含连续学习里程碑和穿插的小测验
- **工具** — 提供星期/月参考、日期与数字转换、日语量词速查以及假名手写识别
- **分析** — 提供 GitHub 风格热力图、折线图、连续学习统计和平均分数
- **PWA** — 支持安装，可离线使用，并带有 Service Worker 缓存
- **国际化** — 支持英语、日语、简体中文、繁体中文
- **主题** — 支持浅色 / 深色 / 跟随系统，以及 8 套配色方案

## 截图

| Kana Chart                                                   | Learn                                                        | Quiz                                                         | Tools                                                        | Tools                                                        | Settings                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| <img width="1179" height="2556" alt="IMG_0353" src="https://github.com/user-attachments/assets/5d6f67b5-522e-43bc-93c7-cc8e1840005e" /> | <img width="1179" height="2556" alt="IMG_0354" src="https://github.com/user-attachments/assets/c02a32b8-f6d4-4ca3-917e-d09a4d1539d1" /> | <img width="1179" height="2556" alt="IMG_0355" src="https://github.com/user-attachments/assets/b3634bfd-4c77-4513-be5a-a7868421a8c0" /> | <img width="1179" height="2556" alt="IMG_0356" src="https://github.com/user-attachments/assets/199769d3-7fef-4e0d-aa83-a9ac45c869ce" /> | <img width="1179" height="2556" alt="IMG_0357" src="https://github.com/user-attachments/assets/6abc4345-ce45-4809-b89f-dceb8086fa6f" /> | <img width="1179" height="2556" alt="IMG_0358" src="https://github.com/user-attachments/assets/4292525f-070a-4c1d-91cf-7b21914bb7d1" /> |

## 快速开始

```bash
bun install
bun dev
```

开发服务器会启动在 [http://localhost:3000](http://localhost:3000)。

## 脚本

| 命令 | 说明 |
| --- | --- |
| `bun dev` | 在 3000 端口启动开发服务器 |
| `bun run build` | 生成生产构建（输出到 `dist/`） |
| `bun run preview` | 本地预览生产构建 |
| `bun run test` | 使用 Vitest 运行测试 |
| `bun run check` | 运行 Biome lint 和格式检查 |
| `bun run lint` | 仅运行 lint |
| `bun run format` | 仅运行格式化 |

## License

MIT License
