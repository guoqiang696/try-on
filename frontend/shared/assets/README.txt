登录页背景视频 / 海报
=====================

把素材放到这个目录(frontend/shared/assets/),文件名如下，login.html 会自动加载：

- login-bg.mp4      左侧自动播放的背景视频（必填，建议竖屏/可裁切的人像或氛围视频）
- login-poster.jpg  视频加载前显示的海报图（可选）

【背景视频轮播】
- 若额外放入 login-bg1.mp4、login-bg2.mp4、login-bg3.mp4 … login.html 会把左侧视频
  做成“多段交叉淡入轮播”，底部出现可点击的指示点。
- 命名规则：login-bg.mp4 为第 1 段，之后依次为 login-bg1.mp4、login-bg2.mp4 …
- 每段最长展示约 8 秒，或该段自然播完即切换；只放 1 个视频时自动退化为单视频循环。
- 想增减视频段数：在 assets 里增删 login-bgN.mp4，并在 login.html 的 #tb-slides 容器里
  增删对应的 <video class="tb-slide"> 节点即可（文件名与 <source src> 要一致）。

说明：
- login.html 用相对路径 `assets/login-bg.mp4`、`assets/login-poster.jpg` 引用。
- 文件就位后刷新登录页即生效，无需改代码（轮播除外，见上）。
- 若暂时没有视频，左侧会显示深紫渐变兜底背景，不会出现破图。
- 视频会被裁切填满（object-fit: cover），建议分辨率 ≥ 1080×1920 或 1280×720。
- 体积建议控制在 ~5MB 以内，避免首屏加载过慢（多段视频会并行预加载）。
