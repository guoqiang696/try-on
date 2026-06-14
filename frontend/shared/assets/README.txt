登录页背景视频 / 海报
=====================

把素材放到这个目录(frontend/shared/assets/),文件名如下，login.html 会自动加载：

- login-bg.mp4      左侧自动播放的背景视频（必填，建议竖屏/可裁切的人像或氛围视频）
- login-poster.jpg  视频加载前显示的海报图（可选）

说明：
- login.html 用相对路径 `assets/login-bg.mp4`、`assets/login-poster.jpg` 引用。
- 文件就位后刷新登录页即生效，无需改代码。
- 若暂时没有视频，左侧会显示深紫渐变兜底背景，不会出现破图。
- 视频会被裁切填满（object-fit: cover），建议分辨率 ≥ 1080×1920 或 1280×720。
- 体积建议控制在 ~5MB 以内，避免首屏加载过慢。
