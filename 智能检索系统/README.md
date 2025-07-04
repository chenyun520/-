# 智能题库检索系统

一个功能强大的智能题库检索和管理系统，支持题目搜索、OCR文字识别、题目添加和批量导入等功能。

## 主要功能

### 🔍 智能搜索
- **关键词搜索**：支持题目和答案内容的模糊匹配
- **赛道筛选**：按班组长赛道和精益经理赛道分类查找
- **实时搜索**：输入关键词时实时显示搜索结果
- **高亮显示**：搜索结果中关键词高亮显示

### 📷 OCR文字识别
- **图片识别**：上传图片自动识别其中的文字内容
- **支持格式**：jpg、png、gif等常见图片格式
- **中英文识别**：支持中文和英文文字识别
- **一键添加**：识别结果可直接添加为新题目

### ➕ 题目管理
- **手动添加**：通过表单手动添加新题目
- **批量导入**：支持文本文件(.txt)批量导入
- **分类管理**：按赛道分类管理题目
- **数据统计**：实时显示题库总量统计
- **编辑删除**：支持题目的编辑和删除操作

### 🎨 现代化界面
- **响应式设计**：支持桌面和移动设备
- **美观界面**：采用现代化UI设计，用户体验友好
- **动画效果**：流畅的过渡动画和交互效果
- **夜间模式**：支持亮色和暗色主题切换

## 文件结构

```
智能检索系统/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # 主要功能脚本
├── questionData.js     # 题库数据管理
├── README.md          # 说明文档
├── 精益经理（20250611更新）(1).docx    # 精益经理题库
└── 班组长精益大赛题库（20250612更新）.docx  # 班组长题库
```

## 使用说明

### 1. 基本操作

#### 搜索题目
- 在搜索框中输入关键词，系统会实时显示匹配的题目
- 点击分类标签可以按赛道筛选题目
- 搜索结果中的关键词会高亮显示

#### 查看题目详情
- 点击题目卡片上的"眼睛"图标查看完整题目和答案
- 详情页面会显示题目的分类、创建时间和关键词

### 2. 添加题目

#### 手动添加
1. 点击"添加题目"按钮
2. 选择赛道分类
3. 输入题目内容和参考答案
4. 点击"添加题目"保存

#### OCR识别添加
1. 点击"OCR识别"按钮
2. 上传包含题目的图片（支持拖拽）
3. 等待系统识别文字内容
4. 编辑识别结果并点击"添加为题目"

### 3. 批量导入

#### 文本文件导入
1. 点击"批量导入"按钮
2. 选择"文本文件导入"
3. 准备格式如下的txt文件：
   ```
   题目1的问题
   题目1的答案
   
   题目2的问题
   题目2的答案
   ```
4. 选择文件后预览导入内容
5. 确认导入

### 4. 编辑和删除
- 点击题目卡片上的"编辑"图标可以修改题目
- 点击"删除"图标可以删除题目（需要确认）

### 5. 主题切换
- 点击页面右上角的月亮/太阳图标切换夜间模式

## 数据存储

系统使用浏览器的 localStorage 来保存题目数据，这意味着：
- 数据保存在本地浏览器中
- 不需要服务器支持
- 清除浏览器数据会导致题目丢失
- 建议定期备份重要题目

## 技术特性

- **纯前端实现**：无需服务器，可直接在浏览器中运行
- **响应式设计**：适配各种屏幕尺寸
- **现代化界面**：使用CSS变量和动画效果
- **本地存储**：使用localStorage保存数据
- **OCR识别**：集成Tesseract.js实现文字识别
- **分页显示**：大量题目时分页显示，提高性能

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 注意事项

1. **Word文档导入**：由于浏览器安全限制，暂不支持直接解析Word文档，建议将内容复制到文本文件中导入
2. **OCR识别**：首次使用OCR功能时需要下载语言包，请保持网络连接
3. **数据备份**：建议定期备份重要题目数据
4. **图片大小**：OCR识别建议使用清晰度较高的图片，文件大小不超过10MB

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 实现基本搜索和题目管理功能
- 支持OCR文字识别
- 支持批量导入功能
- 响应式设计和夜间模式

## 技术支持

如有问题或建议，请联系系统管理员或查看源代码中的注释。

---

**智能题库检索系统** - 让学习更高效，让管理更简单 