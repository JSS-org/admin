# 全站白色健身空间背景

- 使用文件：`white-gym-background.jpg`，1672 × 941，约 116 KB。
- 生成方式：内置 ImageGen，以首版白色背景为参考进行编辑；生成 PNG 编码为 JPEG（质量 88）用于网页加载，保留构图和颜色。
- 接入位置：`src/app.vue` 全局装饰层。62% 白色叠层降低器械与光影对比度；背景不接受鼠标事件，也不参与内容布局。
- 设计方向：白色精品健身空间、远景器械轮廓、镜面反射与柔和自然光。器械留在边缘，中央留白，衬托白色表格与表单。

生成提示词：

```text
Use case: precise-object-edit. Edit target: the supplied pale white abstract website background. Asset type: subtle full-viewport background for a premium gym operations dashboard. Change the setting from abstract plaster sculpture to a photorealistic, airy, upscale boutique FITNESS GYM interior, while preserving the supplied image's very bright white-on-white palette, soft diffuse daylight, quiet luxury mood, wide aspect ratio, and large uncluttered central negative space. The gym identity should be perceptible but understated: far along the rightmost edge and far background, a softly blurred, partially cropped pearl-gray cable training machine with slender uprights and cables, and a low minimalist exercise bench. Far left edge, a subtle wall mirror seam and soft reflections of distant equipment, with gentle vertical window light. Floor: clean very pale warm-gray micro-textured gym rubber with almost invisible seams, receding into the distance. No distinct central objects; central 65 percent of frame must be clean, softly lit near-white wall and empty floor so dense dark text and white UI cards remain readable. Keep all equipment small, off-center, at the far edge, low contrast, softly defocused and partly obscured by airy white light. This must feel like a real premium training room, not an abstract sculpture, not a living room, not a spa, and not a gym advertisement. White and pearl-gray only, no dark/black machines, no colored accents, no foreground dumbbells, no weight closeups, no large dramatic equipment, no people, no typography, no signage, no logos or watermark. Landscape composition, elegant architectural interior photography with soft depth and real material cues. Subtle atmosphere, not a prominent hero photo.
```
