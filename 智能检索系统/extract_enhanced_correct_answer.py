#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
from docx import Document
import os

def extract_enhanced_correct_answer(docx_path, category):
    """增强版按照"正确答案："分界线提取题目"""
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
        
        # 增强版分割策略
        questions = enhanced_split_by_correct_answer(all_paragraphs, category, question_id)
        
        print(f"从 {docx_path} 增强提取到 {len(questions)} 个题目")
        return questions
        
    except Exception as e:
        print(f"提取 {docx_path} 时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

def enhanced_split_by_correct_answer(paragraphs, category, start_id):
    """超级激进版按照"正确答案："分界线分割题目 - 争取5000题"""
    questions = []
    question_id = start_id
    
    current_question_parts = []
    i = 0
    
    while i < len(paragraphs):
        para = paragraphs[i].strip()
        if not para:
            i += 1
            continue
        
        # 超级激进的正确答案识别 - 只要有"正确答案："就分界
        if is_super_aggressive_correct_answer_boundary(para):
            # 找到正确答案标志，当前题目结束
            current_question_parts.append(para)
            
            # 超级宽松的题目构建 - 几乎所有内容都尝试构建成题目
            if len(current_question_parts) >= 1:
                question_data = build_super_aggressive_question(current_question_parts, question_id, category)
                if question_data:
                    questions.append(question_data)
                    question_id += 1
            
            # 重置，开始收集下一题
            current_question_parts = []
        else:
            # 收集题目内容
            current_question_parts.append(para)
        
        i += 1
    
    # 处理最后一个题目
    if len(current_question_parts) > 0:
        question_data = build_super_aggressive_question(current_question_parts, question_id, category)
        if question_data:
            questions.append(question_data)
    
    # 超级宽松的去重 - 保留更多题目
    unique_questions = super_aggressive_remove_duplicates(questions)
    print(f"去重后: {len(unique_questions)} 个唯一题目")
    
    return unique_questions

def is_super_aggressive_correct_answer_boundary(para):
    """优化的正确答案边界识别 - 只保留"正确答案："作为分界线"""
    # 只保留"正确答案"相关的格式，过滤掉"提交答案"
    patterns = [
        r'正确答案[：:]',  # 正确答案：
        r'标准答案[：:]',  # 标准答案：
        r'参考答案[：:]',  # 参考答案：
        # 移除"提交答案"和其他不准确的格式
    ]
    
    for pattern in patterns:
        if re.search(pattern, para, re.IGNORECASE):
            return True
    
    return False

def build_super_aggressive_question(parts, question_id, category):
    """优化的题目构建 - 确保题目质量"""
    if len(parts) < 1:
        return None
    
    # 提取题目内容
    question_text = extract_optimized_question_text(parts)
    if not question_text or len(question_text.strip()) < 8:  # 提高质量门槛
        return None
    
    # 检查题目质量 - 过滤掉只有选项或只有答案的内容
    if is_low_quality_question(question_text):
        return None
    
    # 提取答案内容
    answer_text = extract_enhanced_answer_text(parts)
    
    # 提取关键词
    keywords = extract_keywords(question_text + ' ' + answer_text)
    
    return {
        'id': question_id,
        'category': category,
        'question': question_text.strip(),
        'answer': answer_text.strip(),
        'keywords': keywords,
        'createTime': '2024-01-01T00:00:00.000Z',
        'updateTime': '2024-01-01T00:00:00.000Z'
    }

def is_low_quality_question(question_text):
    """检查是否是低质量题目"""
    # 过滤掉只有选项的内容
    if re.match(r'^[A-F][\.\、]\s*', question_text.strip()):
        return True
    
    # 过滤掉只有答案标识的内容
    if re.match(r'^(正确答案|标准答案|参考答案|答案)[：:]', question_text.strip()):
        return True
    
    # 过滤掉过短且没有实际内容的
    if len(question_text.strip()) < 8:
        return True
    
    # 过滤掉只包含选项字母的内容
    if re.match(r'^[A-F]+$', question_text.strip()):
        return True
    
    # 过滤掉明显不是题目的内容
    low_quality_patterns = [
        r'^(显示|展开|收起|查看|点击)',
        r'^(提交答案|我的答案)',
        r'^[A-F]$',
        r'^[A-F]\s*$',
        r'^[A-F][，,]\s*[A-F]',
    ]
    
    for pattern in low_quality_patterns:
        if re.match(pattern, question_text.strip()):
            return True
    
    return False

def extract_optimized_question_text(parts):
    """优化的题目文本提取 - 提升题目质量"""
    # 策略1：寻找真正的题目内容
    for part in parts:
        part = part.strip()
        
        # 跳过正确答案行
        if is_super_aggressive_correct_answer_boundary(part):
            continue
        
        # 跳过过短的内容
        if len(part) < 8:
            continue
        
        # 跳过明显的选项行
        if re.match(r'^[A-F][\.\、]\s*[^，。？！]*$', part) and len(part) < 60:
            continue
        
        # 清理编号
        clean_part = re.sub(r'^\d+[\.\、]\s*', '', part)
        
        # 优化的题目特征检测
        if (len(clean_part) > 15 and  # 提高长度要求
            ('？' in clean_part or '?' in clean_part or 
             '（' in clean_part or '）' in clean_part or
             any(word in clean_part for word in ['下列', '以下', '选择', '什么', '如何', '哪个', '哪些', 
                                                '是否', '属于', '包括', '根据', '关于', '计算', '分析', 
                                                '确定', '判断', '识别', '评估', '说法', '做法', '方法',
                                                '管理', '生产', '精益', '5S', 'TPM', '班组', '现场', 
                                                '质量', '安全', '成本', '效率', '改善', '标准', '流程']))):
            return clean_part
    
    # 策略2：选择最有意义的段落
    best_candidate = ""
    best_score = 0
    
    for part in parts:
        if is_super_aggressive_correct_answer_boundary(part):
            continue
        
        clean_part = re.sub(r'^\d+[\.\、]\s*', '', part.strip())
        if len(clean_part) < 10:
            continue
        
        # 计算题目质量分数
        score = calculate_question_quality_score(clean_part)
        if score > best_score and score > 3:  # 设置最低质量分数
            best_score = score
            best_candidate = clean_part
    
    if best_candidate:
        return best_candidate
    
    # 策略3：合并有意义的段落
    meaningful_parts = []
    for part in parts:
        if is_super_aggressive_correct_answer_boundary(part):
            break
        
        clean_part = re.sub(r'^\d+[\.\、]\s*', '', part.strip())
        if (len(clean_part) > 8 and 
            not re.match(r'^[A-F][\.\、]', part) and
            not is_low_quality_question(clean_part)):
            meaningful_parts.append(clean_part)
        
        if len(meaningful_parts) >= 3:
            break
    
    if meaningful_parts:
        combined = ' '.join(meaningful_parts)
        if len(combined) > 15 and not is_low_quality_question(combined):
            return combined
    
    return ""

def calculate_question_quality_score(text):
    """计算题目质量分数"""
    score = 0
    
    # 长度分数
    if len(text) > 20:
        score += 2
    elif len(text) > 10:
        score += 1
    
    # 问号分数
    if '？' in text or '?' in text:
        score += 3
    
    # 括号分数（可能是选择题）
    if '（' in text and '）' in text:
        score += 2
    
    # 关键词分数
    question_keywords = ['下列', '以下', '选择', '什么', '如何', '哪个', '哪些', 
                        '是否', '属于', '包括', '根据', '关于', '计算', '分析', 
                        '确定', '判断', '识别', '评估', '说法', '做法', '方法']
    
    for keyword in question_keywords:
        if keyword in text:
            score += 1
    
    # 专业术语分数
    professional_terms = ['精益', '5S', 'TPM', 'JIT', 'PDCA', '班组', '现场', 
                          '质量', '安全', '成本', '效率', '改善', '标准', '流程', '管理']
    
    for term in professional_terms:
        if term in text:
            score += 1
    
    # 减分项
    if re.match(r'^[A-F][\.\、]', text):
        score -= 5  # 选项开头大幅减分
    
    if text.startswith('正确答案') or text.startswith('标准答案'):
        score -= 10  # 答案开头大幅减分
    
    return score

def extract_enhanced_answer_text(parts):
    """增强版答案文本提取"""
    answer_parts = []
    
    for part in parts:
        part = part.strip()
        
        # 正确答案行
        if is_super_aggressive_correct_answer_boundary(part):
            answer_parts.append(part)
        
        # 选择题选项
        elif re.match(r'^[A-F][\.\、]\s*', part):
            answer_parts.append(part)
        
        # 判断题选项
        elif ('A' in part and '正确' in part) or ('B' in part and '错误' in part):
            answer_parts.append(part)
        
        # 包含选项字母的简短内容
        elif re.search(r'[A-F]', part) and len(part) < 50:
            answer_parts.append(part)
    
    return '\n'.join(answer_parts) if answer_parts else '答案待补充'

def extract_keywords(text):
    """提取关键词"""
    if not text:
        return ['精益管理']
    
    # 精益管理专业术语
    professional_terms = [
        '精益生产', '精益', '5S', 'TPM', 'JIT', 'PDCA', 'QC', 'QA', 'TQM',
        '班组长', '班组', '现场管理', '现场', '流水线', '生产线', '工艺',
        '标准化', '改善', '浪费', '效率', '品质', '质量', '成本', '安全',
        '看板', '拉动', '单件流', '快速换模', 'SMED', '自働化', '防错',
        '目视管理', '团队', '沟通', '领导力', '培训', '技能', '绩效',
        '管理', '生产', '制造', '工厂', '车间', '设备', '维护', '检查',
        '库存', '物料', '供应链', '计划', '排程', '节拍', '标准作业'
    ]
    
    keywords = []
    for term in professional_terms:
        if term in text and term not in keywords:
            keywords.append(term)
        if len(keywords) >= 6:
            break
    
    return keywords if keywords else ['精益管理', '生产管理']

def super_aggressive_remove_duplicates(questions):
    """超级宽松的去重 - 保留更多题目"""
    unique_questions = []
    seen_questions = set()
    
    for q in questions:
        # 使用题目前30字符作为去重标识（更短，保留更多）
        key = q['question'][:30].strip().lower()
        key_clean = re.sub(r'[\s\W]+', '', key)
        
        # 超级宽松的去重条件
        if key_clean and len(key_clean) > 4 and key_clean not in seen_questions:  # 进一步降低门槛
            seen_questions.add(key_clean)
            unique_questions.append(q)
        # 即使有重复，如果有任何差异也保留
        elif key_clean and len(key_clean) > 8:
            # 检查是否与已有题目有差异
            is_different = True
            for existing_key in seen_questions:
                if len(existing_key) > 8:
                    # 更宽松的相似度检查
                    similarity = len(set(key_clean).intersection(set(existing_key))) / max(len(key_clean), len(existing_key))
                    if similarity > 0.9:  # 提高相似度阈值，保留更多题目
                        is_different = False
                        break
            
            if is_different:
                seen_questions.add(key_clean)
                unique_questions.append(q)
    
    return unique_questions

def create_enhanced_question_database_js(all_questions):
    """创建增强版题库JavaScript文件"""
    total_count = sum(len(q) for q in all_questions.values())
    
    js_content = f"""// 智能检索系统题库数据 - 增强版按"正确答案："分界提取，包含{total_count}个题目
// 生成时间: {new_date()}
// 提取策略: 基于正确答案分界，增强识别能力

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

// 其他功能函数（保持不变）
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

function extractKeywords(text) {{
    const professionalTerms = ['精益', '5S', 'TPM', 'JIT', 'PDCA', '看板', '改善', '浪费', '效率', '质量', '成本', '安全', '班组', '现场', '生产', '标准', '流程', '团队', '管理', '库存', '物料'];
    const keywords = [];
    professionalTerms.forEach(term => {{
        if (text.includes(term) && !keywords.includes(term)) {{
            keywords.push(term);
        }}
    }});
    return keywords.slice(0, 6);
}}

function saveToLocalStorage() {{
    try {{
        localStorage.setItem('questionDatabase', JSON.stringify(questionDatabase));
    }} catch (error) {{
        console.warn('无法保存到本地存储:', error);
    }}
}}

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

function getRandomQuestions(count = 10, category = 'all') {{
    const questions = getQuestionsByCategory(category);
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}}

// 初始化加载
loadFromLocalStorage();

// 导出给全局使用
if (typeof window !== 'undefined') {{
    window.questionDatabase = questionDatabase;
    window.getAllQuestions = getAllQuestions;
    window.getQuestionsByCategory = getQuestionsByCategory;
    window.searchQuestions = searchQuestions;
    window.getStatistics = getStatistics;
}}
"""
    
    return js_content

def new_date():
    """获取当前日期时间"""
    from datetime import datetime
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def main():
    """主函数"""
    files = {
        '班组长精益大赛题库（20250612更新）.docx': '班组长',
        '精益经理（20250611更新）(1).docx': '精益经理'
    }
    
    all_questions = {}
    
    for filename, category in files.items():
        if os.path.exists(filename):
            print(f"\n🚀 增强版'正确答案：'分界提取: {filename}")
            print(f"目标分类: {category}")
            print("="*60)
            
            questions = extract_enhanced_correct_answer(filename, category)
            all_questions[category] = questions
            
            print(f"✅ {category} 增强提取完成: {len(questions)} 个题目")
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
        js_content = create_enhanced_question_database_js(all_questions)
        
        with open('questionData.js', 'w', encoding='utf-8') as f:
            f.write(js_content)
        
        # 统计信息
        total_questions = sum(len(questions) for questions in all_questions.values())
        
        print(f"\n" + "="*60)
        print("🎉 增强版'正确答案：'分界提取完成！")
        print("="*60)
        print(f"📊 最终统计:")
        print(f"   📋 总计: {total_questions} 个题目")
        
        for category, questions in all_questions.items():
            print(f"   🏷️  {category}: {len(questions)} 个题目")
        
        print(f"\n📄 已更新 questionData.js 文件")
        print(f"💾 文件大小: {os.path.getsize('questionData.js') / 1024:.1f} KB")
        
        # 计算提取率
        total_correct_answers = 13122  # 从分析中得到的数据
        extraction_rate = (total_questions / total_correct_answers) * 100
        print(f"📈 提取率: {extraction_rate:.1f}% (从 {total_correct_answers} 个正确答案中提取)")
        
        # 生成预览文件
        with open('增强版正确答案提取结果.txt', 'w', encoding='utf-8') as f:
            f.write(f"增强版按'正确答案：'分界提取结果 - 总计 {total_questions} 个题目\n")
            f.write(f"提取时间: {new_date()}\n")
            f.write(f"提取率: {extraction_rate:.1f}%\n")
            f.write("="*80 + "\n\n")
            
            for category, questions in all_questions.items():
                f.write(f"{category} - {len(questions)} 个题目\n")
                f.write("-" * 40 + "\n")
                
                for i, q in enumerate(questions[:3], 1):
                    f.write(f"\n题目 {i} (ID: {q['id']}):\n")
                    f.write(f"问题: {q['question']}\n")
                    f.write(f"答案: {q['answer']}\n")
                    f.write(f"关键词: {', '.join(q['keywords'])}\n")
                    f.write("." * 60 + "\n")
                
                if len(questions) > 3:
                    f.write(f"\n... 还有 {len(questions) - 3} 个题目\n\n")
        
        print(f"📋 生成了 '增强版正确答案提取结果.txt' 预览文件")
        print(f"\n🎯 增强版策略，大幅提升提取效率！")
        print(f"💡 现在可以重新加载网页查看 {total_questions} 个题目了！")
        
        if total_questions >= 5000:
            print(f"🎉🎉🎉 太棒了！成功提取到 {total_questions} 个题目，达到了您的5000+目标！")
        elif total_questions >= 4000:
            print(f"🎯🎯 非常接近了！提取到 {total_questions} 个题目，距离5000只差 {5000-total_questions} 个！")
        elif total_questions >= 3000:
            print(f"🎯 很好！提取到 {total_questions} 个题目，向您的5000+目标大步迈进！")
        else:
            print(f"📈 当前 {total_questions} 个题目，继续提升提取率")
        
    else:
        print("❌ 没有提取到任何题目")

if __name__ == "__main__":
    main() 