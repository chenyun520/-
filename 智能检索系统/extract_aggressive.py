#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
from docx import Document
import os

def extract_questions_aggressive(docx_path, category):
    """激进提取：严格按照选择题选项序列结束作为边界"""
    try:
        doc = Document(docx_path)
        questions = []
        question_id = 1 if category == '班组长' else 10000
        
        # 获取所有段落
        all_paragraphs = []
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if text:
                all_paragraphs.append(text)
        
        print(f"处理 {len(all_paragraphs)} 个段落...")
        
        # 激进分割提取
        questions = extract_with_aggressive_rules(all_paragraphs, category, question_id)
        
        print(f"从 {docx_path} 激进提取到 {len(questions)} 个题目")
        return questions
        
    except Exception as e:
        print(f"提取 {docx_path} 时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

def extract_with_aggressive_rules(paragraphs, category, start_id):
    """激进提取规则"""
    questions = []
    question_id = start_id
    
    i = 0
    while i < len(paragraphs):
        current_para = paragraphs[i].strip()
        
        # 更宽松的题目开始判断
        if is_aggressive_question_start(current_para):
            # 激进提取到下一个边界
            question_data = extract_aggressive_question(paragraphs, i)
            
            if question_data and is_aggressive_valid_question(question_data):
                question_data['id'] = question_id
                question_data['category'] = category
                question_data['createTime'] = '2024-01-01T00:00:00.000Z'
                question_data['updateTime'] = '2024-01-01T00:00:00.000Z'
                
                questions.append(question_data)
                question_id += 1
            
            # 跳到下一个位置
            i = question_data.get('next_index', i + 1) if question_data else i + 1
        else:
            i += 1
    
    # 去重处理
    unique_questions = remove_aggressive_duplicates(questions)
    print(f"去重后: {len(unique_questions)} 个唯一题目")
    
    return unique_questions

def is_aggressive_question_start(para):
    """更宽松的题目开始判断"""
    # 数字编号开头
    if re.match(r'^\d+[\.\、]', para):
        return True
    
    # 包含问号
    if ('？' in para or '?' in para) and len(para) > 8:
        return True
    
    # 包含常见题目词汇
    question_words = ['下列', '以下', '选择', '哪个', '哪些', '什么', '如何', '根据', '按照', '关于', 
                     '下面', '上述', '正确', '错误', '属于', '不属于', '包括', '不包括', '是', '不是']
    if any(word in para for word in question_words) and len(para) > 10:
        return True
    
    # 包含括号（填空题）
    if ('（' in para and '）' in para) and len(para) > 10:
        return True
    
    # 包含常见精益管理词汇的长句子
    lean_words = ['精益', '5S', 'TPM', 'JIT', 'PDCA', '看板', '改善', '浪费', '效率', '质量', '成本', '安全']
    if any(word in para for word in lean_words) and len(para) > 15:
        return True
    
    return False

def extract_aggressive_question(paragraphs, start_index):
    """激进提取单个题目"""
    if start_index >= len(paragraphs):
        return None
    
    question_text = clean_aggressive_question(paragraphs[start_index])
    all_content = [paragraphs[start_index]]
    
    i = start_index + 1
    while i < len(paragraphs):
        current_para = paragraphs[i].strip()
        
        # 检查是否到达严格的边界
        boundary_result = check_aggressive_boundary(paragraphs, i)
        if boundary_result['is_boundary']:
            # 包含边界内容
            if boundary_result['include_content']:
                all_content.extend(boundary_result['content'])
            break
        
        # 收集内容
        all_content.append(current_para)
        
        # 防止无限循环
        if i - start_index > 30:
            break
            
        i += 1
    
    # 构建完整答案
    full_answer = build_aggressive_answer(all_content, question_text)
    
    # 提取关键词
    keywords = extract_aggressive_keywords(' '.join(all_content))
    
    return {
        'question': question_text,
        'answer': full_answer,
        'keywords': keywords,
        'next_index': i
    }

def check_aggressive_boundary(paragraphs, current_index):
    """检查激进边界：严格的选择题选项序列结束"""
    # 选择题边界：完整的A B C D 序列
    choice_boundary = check_aggressive_choice_boundary(paragraphs, current_index)
    if choice_boundary['found']:
        return {
            'is_boundary': True,
            'include_content': True,
            'content': choice_boundary['content']
        }
    
    # 判断题边界：A 正确 B 错误
    judgment_boundary = check_aggressive_judgment_boundary(paragraphs, current_index)
    if judgment_boundary['found']:
        return {
            'is_boundary': True,
            'include_content': True,
            'content': judgment_boundary['content']
        }
    
    # 正确答案边界
    if current_index < len(paragraphs):
        current_para = paragraphs[current_index].strip()
        if re.match(r'^正确答案[：:]', current_para):
            return {
                'is_boundary': True,
                'include_content': True,
                'content': [current_para]
            }
    
    return {'is_boundary': False, 'include_content': False, 'content': []}

def check_aggressive_choice_boundary(paragraphs, start_index):
    """检查激进选择题边界"""
    if start_index >= len(paragraphs):
        return {'found': False, 'content': []}
    
    # 寻找连续的选项
    options = []
    expected_letters = ['A', 'B', 'C', 'D', 'E', 'F']
    
    # 检查当前位置开始的选项序列
    option_start = None
    for i in range(start_index, min(start_index + 8, len(paragraphs))):
        para = paragraphs[i].strip()
        
        # 查找A选项开始
        if re.match(r'^A[\.\、]\s*', para):
            option_start = i
            break
    
    if option_start is None:
        return {'found': False, 'content': []}
    
    # 从A选项开始收集连续选项
    current_letter_index = 0
    for i in range(option_start, min(option_start + 6, len(paragraphs))):
        para = paragraphs[i].strip()
        
        if current_letter_index < len(expected_letters):
            expected_letter = expected_letters[current_letter_index]
            if re.match(rf'^{expected_letter}[\.\、]\s*', para):
                options.append(para)
                current_letter_index += 1
            else:
                break
        else:
            break
    
    # 检查是否找到完整的序列
    if len(options) >= 3:  # 至少A B C
        return {'found': True, 'content': options}
    
    return {'found': False, 'content': []}

def check_aggressive_judgment_boundary(paragraphs, start_index):
    """检查激进判断题边界"""
    if start_index >= len(paragraphs):
        return {'found': False, 'content': []}
    
    # 寻找各种判断题格式
    for i in range(start_index, min(start_index + 3, len(paragraphs))):
        para = paragraphs[i].strip()
        
        # 检查是否包含正确和错误
        if '正确' in para and '错误' in para:
            return {'found': True, 'content': [para]}
        
        # 检查A 正确格式
        if re.match(r'^A[\.\、]?\s*正确', para):
            content = [para]
            # 寻找B 错误
            for j in range(i + 1, min(i + 3, len(paragraphs))):
                next_para = paragraphs[j].strip()
                if re.match(r'^B[\.\、]?\s*错误', next_para):
                    content.append(next_para)
                    return {'found': True, 'content': content}
            return {'found': True, 'content': content}
    
    return {'found': False, 'content': []}

def build_aggressive_answer(all_content, question_text):
    """构建激进答案"""
    answer_parts = []
    
    for content in all_content[1:]:  # 跳过题目本身
        content = content.strip()
        if not content:
            continue
            
        # 选项
        if re.match(r'^[A-Z][\.\、]\s*', content):
            answer_parts.append(content)
        # 正确答案
        elif '正确答案' in content:
            answer_parts.append(content)
        # 判断题答案
        elif '正确' in content or '错误' in content:
            answer_parts.append(content)
        # 其他可能的答案内容
        elif len(content) < 100 and any(char in content for char in 'ABCDEF'):
            answer_parts.append(content)
    
    return '\n'.join(answer_parts) if answer_parts else '需要补充答案'

def clean_aggressive_question(text):
    """激进清理题目文本"""
    if not text:
        return ""
    
    # 基本清理
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'^\d+[\.\、]\s*', '', text)
    text = re.sub(r'\(\d+分/\d+分\)', '', text)
    
    # 移除一些考试系统标记
    text = re.sub(r'标记$', '', text)
    text = re.sub(r'^\s*[^\u4e00-\u9fff\w]*', '', text)
    
    return text.strip()

def extract_aggressive_keywords(text):
    """激进关键词提取"""
    if not text:
        return ['精益管理', '班组管理']
    
    # 专业术语
    professional_terms = {
        '精益生产', '精益', '5S', 'TPM', 'JIT', 'PDCA', 'QC', 'QA', 'TQM',
        '班组长', '班组', '现场管理', '现场', '流水线', '生产线', '工艺流程', '工艺',
        '标准化作业', '标准化', '标准作业', '持续改善', '改善', 'KAIZEN',
        '价值流图', '价值流', '浪费消除', '浪费', '七大浪费', '效率提升', '效率',
        '品质管理', '品质', '质量控制', '质量', '成本控制', '成本', '交期管理', '交期',
        '安全生产', '安全管理', '安全', '环境保护', '环保', '创新改善', '创新',
        '看板管理', '看板', '拉动生产', '拉动', '单件流', '快速换模', 'SMED',
        '自働化', '防错法', '防呆', '目视管理', '目视化', '团队建设', '团队',
        '沟通技巧', '沟通', '领导力', '培训', '技能', '绩效考核', '绩效', '激励'
    }
    
    words = re.findall(r'[\u4e00-\u9fff]+', text)
    keywords = []
    
    # 专业术语优先
    for word in words:
        for term in professional_terms:
            if word in term and term not in keywords:
                keywords.append(term)
                break
        if word in professional_terms and word not in keywords:
            keywords.append(word)
    
    # 其他关键词
    stop_words = {
        '的', '是', '和', '在', '有', '一', '个', '与', '等', '或', '及', '为', '了', '对', '通过',
        '什么', '哪些', '以下', '包括', '主要', '可以', '需要', '进行', '应该', '能够', '选择'
    }
    
    for word in words:
        if (len(word) >= 2 and word not in stop_words and 
            word not in keywords and len(word) <= 5):
            keywords.append(word)
        
        if len(keywords) >= 6:
            break
    
    return keywords if keywords else ['精益管理', '班组管理']

def is_aggressive_valid_question(question_data):
    """激进验证题目质量"""
    if not question_data:
        return False
    
    question = question_data.get('question', '')
    answer = question_data.get('answer', '')
    
    # 更宽松的长度检查
    if len(question) < 5 or len(question) > 1000:
        return False
    
    # 更宽松的内容特征检查
    has_question_mark = '？' in question or '?' in question
    has_options = re.search(r'[A-Z][\.\、]', answer)
    has_brackets = '（' in question or '(' in question
    has_judgment = '正确' in answer or '错误' in answer
    has_keywords = any(word in question for word in ['选择', '下列', '以下', '什么', '如何', '哪个'])
    
    if not (has_question_mark or has_options or has_brackets or has_judgment or has_keywords):
        return False
    
    # 排除明显无效内容
    if re.match(r'^[A-Z][\.\、]\s*$', question):
        return False
    
    return True

def remove_aggressive_duplicates(questions):
    """激进去重处理"""
    unique_questions = []
    seen_questions = set()
    
    for q in questions:
        # 使用题目前60字符作为标识
        key = q['question'][:60].strip().lower()
        key_clean = re.sub(r'[\s\W]+', '', key)
        
        if key_clean and len(key_clean) > 5 and key_clean not in seen_questions:
            seen_questions.add(key_clean)
            unique_questions.append(q)
    
    # 重新分配ID
    for i, q in enumerate(unique_questions):
        q['id'] = i + 1
    
    return unique_questions

def create_aggressive_js(all_questions):
    """创建激进提取的JS文件"""
    total_count = sum(len(q) for q in all_questions.values())
    
    js_content = f"""// 激进提取的题库数据 - 包含{total_count}个题目
// 严格按照A B C D选项序列结束和A正确B错误为边界，最大化提取题目数量

let questionDatabase = {json.dumps(all_questions, ensure_ascii=False, indent=2)};

// 获取所有题目
function getAllQuestions() {{
    let allQuestions = [];
    Object.keys(questionDatabase).forEach(category => {{
        allQuestions = allQuestions.concat(questionDatabase[category]);
    }});
    return allQuestions;
}}

// 根据分类获取题目
function getQuestionsByCategory(category) {{
    if (category === 'all') {{
        return getAllQuestions();
    }}
    return questionDatabase[category] || [];
}}

// 搜索题目
function searchQuestions(query, category = 'all') {{
    let questions = getQuestionsByCategory(category);
    
    if (!query || query.trim() === '') {{
        return questions;
    }}
    
    const searchTerms = query.toLowerCase().trim().split(/\\s+/);
    
    return questions.filter(question => {{
        const questionText = question.question.toLowerCase();
        const answerText = question.answer.toLowerCase();
        const keywordText = question.keywords.join(' ').toLowerCase();
        const allText = questionText + ' ' + answerText + ' ' + keywordText;
        
        return searchTerms.every(term => allText.includes(term));
    }});
}}

// 添加新题目
function addQuestion(questionData) {{
    const allQuestions = getAllQuestions();
    const newId = allQuestions.length > 0 ? Math.max(...allQuestions.map(q => q.id)) + 1 : 1;
    const newQuestion = {{
        id: newId,
        category: questionData.category,
        question: questionData.question,
        answer: questionData.answer,
        keywords: extractKeywords(questionData.question + ' ' + questionData.answer),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
    }};
    
    if (!questionDatabase[questionData.category]) {{
        questionDatabase[questionData.category] = [];
    }}
    
    questionDatabase[questionData.category].push(newQuestion);
    saveToLocalStorage();
    return newQuestion;
}}

// 提取关键词
function extractKeywords(text) {{
    const commonWords = ['的', '是', '和', '在', '有', '一', '个', '与', '等', '或', '及', '为', '了', '对', '通过', '如何', '什么', '哪些'];
    const words = text.match(/[\\u4e00-\\u9fff]+/g) || [];
    const keywords = [...new Set(words.filter(word => 
        word.length >= 2 && !commonWords.includes(word)
    ))];
    return keywords.slice(0, 6);
}}

// 保存到本地存储
function saveToLocalStorage() {{
    try {{
        localStorage.setItem('questionDatabase', JSON.stringify(questionDatabase));
    }} catch (error) {{
        console.warn('无法保存到本地存储:', error);
    }}
}}

// 从本地存储加载
function loadFromLocalStorage() {{
    try {{
        const stored = localStorage.getItem('questionDatabase');
        if (stored) {{
            const parsed = JSON.parse(stored);
            Object.keys(parsed).forEach(category => {{
                if (!questionDatabase[category]) {{
                    questionDatabase[category] = [];
                }}
                parsed[category].forEach(question => {{
                    const exists = questionDatabase[category].some(q => q.id === question.id);
                    if (!exists) {{
                        questionDatabase[category].push(question);
                    }}
                }});
            }});
        }}
    }} catch (error) {{
        console.warn('从本地存储加载数据失败:', error);
    }}
}}

// 获取统计信息
function getStatistics() {{
    const allQuestions = getAllQuestions();
    const stats = {{
        total: allQuestions.length,
        categories: {{}}
    }};
    
    Object.keys(questionDatabase).forEach(category => {{
        stats.categories[category] = questionDatabase[category].length;
    }});
    
    return stats;
}}

// 批量导入题目
function importQuestions(questions) {{
    let importedCount = 0;
    questions.forEach(questionData => {{
        try {{
            addQuestion(questionData);
            importedCount++;
        }} catch (error) {{
            console.error('导入题目失败:', error, questionData);
        }}
    }});
    return importedCount;
}}

// 删除题目
function deleteQuestion(id) {{
    Object.keys(questionDatabase).forEach(category => {{
        const index = questionDatabase[category].findIndex(q => q.id === id);
        if (index !== -1) {{
            questionDatabase[category].splice(index, 1);
            saveToLocalStorage();
            return true;
        }}
    }});
    return false;
}}

// 更新题目
function updateQuestion(id, updatedData) {{
    Object.keys(questionDatabase).forEach(category => {{
        const index = questionDatabase[category].findIndex(q => q.id === id);
        if (index !== -1) {{
            questionDatabase[category][index] = {{
                ...questionDatabase[category][index],
                ...updatedData,
                updateTime: new Date().toISOString()
            }};
            saveToLocalStorage();
            return true;
        }}
    }});
    return false;
}}

// 初始化加载
loadFromLocalStorage();
"""
    
    return js_content

def main():
    """主函数"""
    files = {
        '班组长精益大赛题库（20250612更新）.docx': '班组长',
        '精益经理（20250611更新）(1).docx': '精益经理'
    }
    
    all_questions = {}
    
    for filename, category in files.items():
        if os.path.exists(filename):
            print(f"\n🚀 开始激进提取: {filename}")
            print(f"目标分类: {category}")
            print("="*60)
            
            questions = extract_questions_aggressive(filename, category)
            all_questions[category] = questions
            
            print(f"✅ {category} 激进提取完成: {len(questions)} 个题目")
        else:
            print(f"❌ 文件不存在: {filename}")
    
    if all_questions:
        # 重新分配全局唯一ID
        question_id = 1
        for category in all_questions:
            for q in all_questions[category]:
                q['id'] = question_id
                question_id += 1
        
        # 生成JS文件
        js_content = create_aggressive_js(all_questions)
        
        with open('questionData.js', 'w', encoding='utf-8') as f:
            f.write(js_content)
        
        # 统计信息
        total_questions = sum(len(questions) for questions in all_questions.values())
        
        print(f"\n" + "="*60)
        print("🎉 激进提取完成！")
        print("="*60)
        print(f"📊 最终统计:")
        print(f"   📋 总计: {total_questions} 个题目")
        
        for category, questions in all_questions.items():
            print(f"   🏷️  {category}: {len(questions)} 个题目")
        
        print(f"\n📄 已更新 questionData.js 文件")
        print(f"💾 文件大小: {os.path.getsize('questionData.js') / 1024:.1f} KB")
        
        # 生成预览
        with open('激进提取结果.txt', 'w', encoding='utf-8') as f:
            f.write(f"激进提取结果 - 总计 {total_questions} 个题目\n")
            f.write("严格按照A B C D选项序列结束和A正确B错误为边界，最大化提取\n")
            f.write("="*80 + "\n\n")
            
            for category, questions in all_questions.items():
                f.write(f"{category} - {len(questions)} 个题目\n")
                f.write("-" * 40 + "\n")
                
                for i, q in enumerate(questions[:8], 1):
                    f.write(f"\n题目 {i}:\n")
                    f.write(f"问题: {q['question']}\n")
                    f.write(f"答案: {q['answer']}\n")
                    f.write(f"关键词: {', '.join(q['keywords'])}\n")
                    f.write("." * 60 + "\n")
                
                if len(questions) > 8:
                    f.write(f"\n... 还有 {len(questions) - 8} 个题目\n\n")
        
        print(f"📋 生成了 '激进提取结果.txt' 预览文件")
        print(f"\n🚀 激进提取完成，严格边界识别！")
        print(f"💡 现在可以重新加载网页查看 {total_questions} 个题目了！")
        
        if total_questions >= 5000:
            print(f"🎉 太棒了！提取到 {total_questions} 个题目，超越了5000+的目标！")
        elif total_questions >= 3000:
            print(f"🎯 不错！提取到 {total_questions} 个题目，向5000+目标迈进！")
        else:
            print(f"⚠️  当前 {total_questions} 个题目，继续努力达到5000+")
        
    else:
        print("❌ 没有提取到任何题目")

if __name__ == "__main__":
    main() 