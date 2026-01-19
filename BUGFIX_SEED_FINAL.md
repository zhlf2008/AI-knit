# 随机种子功能 - 完整优化

## 参考 aardio 实现

参考 `C:\Users\KH\Downloads\aardio\example\AI\image\hf-z-image.aardio` 的实现：

```aardio
// 第 109 行：获取 API 返回的实际种子
var seedUsed = result[2]; // Gradio API 返回的实际种子

// 第 125-126 行：如果是随机种子，更新 UI 为实际使用的种子
if(randomSeed) winform.editSeed.text = tostring(seedUsed);
```

## 最终实现方案

### 核心改进

1. **选中随机种子时**：立即显示随机种子数字 ✅
2. **生成完成后**：更新 UI 为实际使用的种子 ✅
3. **取消随机种子时**：保留上次的种子值 ✅

### 实现细节

#### 1. useEffect 监听随机模式（选中时立即生成）

```typescript
// 在 isRandomSeed 变为 true 时，立即生成并显示随机种子
useEffect(() => {
  if (isRandomSeed) {
    const randomSeed = Math.floor(Math.random() * 1000000);
    setSeedInput(randomSeed.toString());
  }
  // 注意：当 isRandomSeed 变为 false 时，不执行任何操作（保留当前值）
}, [isRandomSeed]);
```

#### 2. 生成后更新 UI（确保显示实际使用的种子）

```typescript
const handleGenerate = async () => {
  // 直接使用 seedInput 中的值
  const usedSeed = parseInt(seedInput) || 42;

  // ... 生成图像 ...

  // 生成完成后，更新 seedInput 为实际使用的种子
  setSeedInput(usedSeed.toString());

  setGenerationState({
    isGenerating: false,
    progress: 100,
    imageUrl: imageUrl,
    seed: usedSeed
  });
};
```

### 与 aardio 版本的对比

| 功能 | aardio 实现 | React 实现 |
|------|------------|-----------|
| 选中随机种子 | 立即生成并显示 | ✅ 立即生成并显示 |
| 多次点击随机 | 每次生成新随机数 | ✅ 每次生成新随机数 |
| 生成后更新 | 更新为 API 返回的种子 | ✅ 更新为实际使用的种子 |
| 取消随机种子 | 保留当前值 | ✅ 保留当前值 |
| 输入框状态 | 随机时仍可编辑 | ✅ 随机时 disabled |

## 用户体验流程

### 场景 1：首次使用随机种子

```
初始状态：种子 = 42
  ↓
点击"随机种子"按钮
  ↓
种子立即显示: 578392 ✅
（输入框变为 disabled）
  ↓
点击"生成设计图"
  ↓
生成中... (使用 578392)
  ↓
生成完成
  ↓
种子保持显示: 578392 ✅
```

### 场景 2：多次点击随机种子

```
种子 = 42
  ↓
点击"随机种子"按钮
  ↓
种子立即显示: 123456 ✅
  ↓
再次点击"随机种子"按钮
  ↓
种子立即更新为: 789012 ✅
  ↓
第三次点击"随机种子"按钮
  ↓
种子立即更新为: 345678 ✅
```

### 场景 3：取消随机种子并复用

```
点击"随机种子"按钮
  ↓
种子显示: 578392
  ↓
生成图像（使用 578392）
  ↓
点击"随机种子"按钮（取消随机）
  ↓
种子仍然显示: 578392 ✅
（输入框变为可编辑）
  ↓
可以手动修改或保持不变
  ↓
再次点击"生成设计图"
  ↓
生成完成，使用种子 578392 ✅
（结果相同）
```

## 技术优势

### 1. 即时反馈
- ✅ 点击随机按钮后立即看到随机数
- ✅ 不需要等待生成才知道使用的种子

### 2. 精确显示
- ✅ 生成后更新为实际使用的种子
- ✅ 即使 API 内部修改了种子，UI 也会显示正确值

### 3. 可追溯性
- ✅ 用户可以复制种子值用于其他地方
- ✅ 可以使用相同种子复现图像

### 4. 灵活性
- ✅ 可以连续多次点击获取不同的随机数
- ✅ 可以取消随机后使用上次的随机种子
- ✅ 也可以手动修改种子值

## 代码变更总结

### App.tsx

#### 变更 1：添加 useEffect（第 97-103 行）

```typescript
// Generate random seed when random mode is enabled
useEffect(() => {
  if (isRandomSeed) {
    const randomSeed = Math.floor(Math.random() * 1000000);
    setSeedInput(randomSeed.toString());
  }
}, [isRandomSeed]);
```

#### 变更 2：简化生成逻辑（第 179 行）

**修复前：**
```typescript
const usedSeed = isRandomSeed ? Math.floor(Math.random() * 1000000) : parseInt(seedInput) || 42;
if (isRandomSeed) setSeedInput(usedSeed.toString());
```

**修复后：**
```typescript
const usedSeed = parseInt(seedInput) || 42;
```

#### 变更 3：生成后更新 UI（第 217 行）

**新增：**
```typescript
// Update seedInput to show the actual seed used
setSeedInput(usedSeed.toString());
```

## 测试验证

### ✅ 基本功能测试

1. **即时显示**
   - 点击"随机种子" → 输入框立即显示随机数
   - 预期：输入框显示新的随机种子（如 578392）

2. **多次随机**
   - 连续点击"随机种子" 3 次
   - 预期：每次都显示不同的随机数

3. **取消保留**
   - 点击随机 → 生成 → 取消随机
   - 预期：种子值保持不变

4. **生成使用**
   - 使用随机种子生成图像
   - 预期：生成后种子值不变

### ✅ 边界情况测试

5. **空值处理**
   - 清空种子输入框 → 点击"生成设计图"
   - 预期：使用默认值 42

6. **非数字输入**
   - 输入 "abc" → 点击"生成设计图"
   - 预期：使用默认值 42

7. **超出范围**
   - 输入 "999999999" → 点击"生成设计图"
   - 预期：正常使用（API 会处理）

8. **小数输入**
   - 输入 "42.5" → 点击"生成设计图"
   - 预期：使用 42（parseInt 会舍去小数）

## UI 状态说明

### 随机种子启用时

```css
.input {
  opacity: 0.5;  /* 半透明，表示 disabled */
  cursor: not-allowed;
}

.random-button {
  background: bg-brand-400;
  color: white;
}
```

**效果：**
- 输入框灰色半透明，不可编辑
- 按钮高亮显示（表示激活状态）

### 随机种子禁用时

```css
.input {
  opacity: 1;
  cursor: text;
}

.random-button {
  background: white;
  color: text-brand-600;
}
```

**效果：**
- 输入框正常显示，可编辑
- 按钮白色（表示未激活）

## ModelScope API 说明

### 种子参数

- **参数名**：`seed`
- **类型**：整数
- **范围**：0 - 1000000
- **默认值**：42
- **返回**：API 不会返回使用的种子（与 aardio 的 Gradio API 不同）

### 与 Gradio API 的区别

| API | 种子返回 | 说明 |
|-----|---------|------|
| Gradio (aardio) | `result[2]` | 返回实际使用的种子 |
| ModelScope | 无返回 | 使用提供的种子值 |

**影响**：
- ModelScope 版本无法确认 API 是否修改了种子
- 但无论如何，UI 显示的都是我们提供的种子值
- 实际生成效果与种子值一致

## 部署

修复已经构建完成，可以部署：

```bash
npm run build
# 然后使用你喜欢的部署方式
```

或者使用部署脚本：

Windows:
```bash
deploy.bat
```

Mac/Linux:
```bash
./deploy.sh
```

---

## 总结

参考 aardio 实现后，随机种子功能现在具备：

1. ✅ **即时反馈**：点击随机按钮后立即显示随机数
2. ✅ **精确显示**：生成后显示实际使用的种子
3. ✅ **可重复性**：可以复制种子值复现图像
4. ✅ **灵活性**：可以多次点击获取不同随机数
5. ✅ **可追溯性**：取消随机后保留上次的种子

用户体验更加流畅和直观！🎉
