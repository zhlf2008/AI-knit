# 修复：分类和标签自动保存问题

## 问题描述

在"高级设置"中添加、删除或拖拽分类/标签后：
- ❌ 配置没有自动保存到 localStorage
- ❌ 关闭并重新打开配置后，修改丢失
- ❌ 首页界面没有显示新增的分类/标签

## 问题原因

在 `components/ConfigModal.tsx` 中，以下函数只更新了 `localConfig` 状态，但**没有调用 `handleAutoSave`** 来保存到父组件：

- `handleAddCategory` - 添加分类
- `handleDeleteCategory` - 删除分类
- `handleAddItem` - 添加标签
- `handleDeleteItem` - 删除标签
- `handleCatDrop` - 拖拽分类
- `handleItemDrop` - 拖拽标签

这导致：
1. `localConfig` 更新（UI 显示变化）
2. 但 `onSave(localConfig)` 没有被调用
3. 父组件的 `config` 状态不更新
4. localStorage 不会保存
5. 首页使用的仍是旧配置

## 解决方案

在所有修改 `localConfig.categories` 的地方，添加 `handleAutoSave(newConfig)` 调用。

### 修复示例

**修复前：**
```typescript
const handleAddCategory = () => {
  const newCat: Category = { ... };
  setLocalConfig(prev => ({
    ...prev,
    categories: [...prev.categories, newCat]
  }));
  // ❌ 没有保存
};
```

**修复后：**
```typescript
const handleAddCategory = () => {
  const newCat: Category = { ... };
  const newConfig = {
    ...localConfig,
    categories: [...localConfig.categories, newCat]
  };
  setLocalConfig(newConfig);
  handleAutoSave(newConfig); // ✅ 保存到父组件
};
```

## 修复的函数

所有涉及 `categories` 修改的函数都已修复：

1. ✅ `handleAddCategory` - 添加新分类
2. ✅ `handleDeleteCategory` - 删除分类
3. ✅ `handleAddItem` - 添加标签项
4. ✅ `handleDeleteItem` - 删除标签项
5. ✅ `handleCatDrop` - 拖拽排序分类
6. ✅ `handleItemDrop` - 拖拽排序标签

## 测试验证

### 测试步骤：

1. 打开应用，点击"高级设置"
2. 切换到"分类标签"标签页
3. 添加一个新分类（例如"测试分类"）
4. 在新分类中添加几个标签
5. 关闭配置弹窗
6. **验证 1**：首页应该显示新分类
7. 刷新页面
8. 重新打开"高级设置" -> "分类标签"
9. **验证 2**：新分类和标签应该仍然存在

### 预期结果：

- ✅ 添加分类后立即保存
- ✅ 添加标签后立即保存
- ✅ 删除后立即保存
- ✅ 拖拽排序后立即保存
- ✅ 关闭弹窗后，首页立即更新
- ✅ 刷新页面后，所有修改仍然存在

## 技术细节

### 保存流程

```
用户操作
  ↓
handleAddCategory / handleAddItem / etc.
  ↓
更新 localConfig 状态
  ↓
调用 handleAutoSave(newConfig)
  ↓
调用 onSave(newConfig)
  ↓
父组件更新 config 状态
  ↓
useEffect 触发，保存到 localStorage
  ↓
首页显示最新配置
```

### 关键代码

在 `App.tsx` 中：
```typescript
// 持久化 config 到 localStorage
useEffect(() => {
  localStorage.setItem('app_config', JSON.stringify(config));
}, [config]);

// 当 categories 改变时，初始化 selections
useEffect(() => {
  const initialSelections: Record<string, string> = {};
  config.categories.forEach(cat => {
    if (cat.items.length > 0 && !selections[cat.id]) {
      initialSelections[cat.id] = cat.items[0];
    }
  });
  if (Object.keys(initialSelections).length > 0) {
    setSelections(prev => ({ ...prev, ...initialSelections }));
  }
}, [config.categories]);
```

## 注意事项

### 已自动保存的操作

- ✅ API Key 修改
- ✅ 迭代步数调整
- ✅ 时间偏移调整
- ✅ 分类添加/删除（新修复）
- ✅ 标签添加/删除（新修复）
- ✅ 分类拖拽排序（新修复）
- ✅ 标签拖拽排序（新修复）

### 需要手动保存的操作

目前没有需要手动保存的操作，所有修改都会自动保存并显示"配置已自动保存"提示。

## 文件变更

- **components/ConfigModal.tsx**
  - 修改了 6 个函数，添加 `handleAutoSave(newConfig)` 调用
  - 无其他逻辑变更

## 部署

应用修复后，重新构建并部署：

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

修复完成！现在所有分类和标签的修改都会自动保存并立即在首页生效。🎉
