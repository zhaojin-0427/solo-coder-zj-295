from flask import Blueprint, request, jsonify
from datetime import date, timedelta
from collections import defaultdict, Counter
from models import db, CareSuggestion, EmotionRecord, StressRecord, SupportUsage, BabySchedule, CounselingResource

care_bp = Blueprint('care', __name__)

CATEGORIES = {
    'rest_reminder': '休息提醒',
    'stress_coping': '压力应对',
    'support_contact': '可联系支持',
    'psych_resource': '心理资源',
    'baby_schedule': '宝宝作息调整',
}


def _consecutive_low_mood(emotion_records, threshold=4):
    consecutive = 0
    for r in sorted(emotion_records, key=lambda x: x.record_date, reverse=True):
        if r.emotion_score <= threshold:
            consecutive += 1
        else:
            break
    return consecutive


def _severe_sleep_deficit(emotion_records, min_hours=4.0):
    consecutive = 0
    for r in sorted(emotion_records, key=lambda x: x.record_date, reverse=True):
        if r.sleep_hours > 0 and r.sleep_hours < min_hours:
            consecutive += 1
        else:
            break
    return consecutive


def _avg_emotion(emotion_records):
    if not emotion_records:
        return 0
    return sum(r.emotion_score for r in emotion_records) / len(emotion_records)


def _avg_sleep_hours(emotion_records):
    records_with_sleep = [r for r in emotion_records if r.sleep_hours > 0]
    if not records_with_sleep:
        return 0
    return sum(r.sleep_hours for r in records_with_sleep) / len(records_with_sleep)


def _avg_sleep_quality(emotion_records):
    if not emotion_records:
        return 0
    return sum(r.sleep_quality for r in emotion_records) / len(emotion_records)


def _top_stress_types(stress_records):
    if not stress_records:
        return []
    counter = Counter(r.stress_type for r in stress_records)
    return counter.most_common(3)


def _used_support_types(support_records):
    used = [r for r in support_records if r.used]
    if not used:
        return []
    counter = Counter(r.support_type for r in used)
    return counter.most_common(5)


def _unused_support_types(support_records):
    all_types = set(r.support_type for r in support_records)
    used_types = set(r.support_type for r in support_records if r.used)
    unused = all_types - used_types
    return list(unused)


def _baby_avg_data(baby_records):
    if not baby_records:
        return None
    avg_sleep = sum(b.sleep_total_hours for b in baby_records) / len(baby_records)
    avg_feed = sum(b.feed_count for b in baby_records) / len(baby_records)
    avg_crying = sum(b.crying_duration for b in baby_records) / len(baby_records)
    return {'avg_sleep': avg_sleep, 'avg_feed': avg_feed, 'avg_crying': avg_crying}


def generate_suggestions(user_id):
    today = date.today()
    start_date = today - timedelta(days=6)

    emotion_records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= start_date,
        EmotionRecord.record_date <= today
    ).all()

    stress_records = StressRecord.query.filter(
        StressRecord.user_id == user_id,
        StressRecord.record_date >= start_date,
        StressRecord.record_date <= today
    ).all()

    support_records = SupportUsage.query.filter(
        SupportUsage.user_id == user_id,
        SupportUsage.record_date >= start_date,
        SupportUsage.record_date <= today
    ).all()

    baby_records = BabySchedule.query.filter(
        BabySchedule.user_id == user_id,
        BabySchedule.record_date >= start_date,
        BabySchedule.record_date <= today
    ).all()

    suggestions = []
    consecutive_low = _consecutive_low_mood(emotion_records)
    consecutive_sleep_deficit = _severe_sleep_deficit(emotion_records)
    avg_emotion = _avg_emotion(emotion_records)
    avg_sleep = _avg_sleep_hours(emotion_records)
    avg_quality = _avg_sleep_quality(emotion_records)
    top_stress = _top_stress_types(stress_records)
    used_support = _used_support_types(support_records)
    unused_support = _unused_support_types(support_records)
    baby_data = _baby_avg_data(baby_records)
    need_urgent = consecutive_low >= 3 or consecutive_sleep_deficit >= 3

    if need_urgent:
        emergency_resources = CounselingResource.query.filter_by(is_emergency=True).all()
        for res in emergency_resources[:2]:
            suggestions.append({
                'category': 'psych_resource',
                'content': f'【紧急推荐】{res.title}：{res.description} 联系方式：{res.contact}',
                'priority': 'urgent',
            })
        suggestions.append({
            'category': 'psych_resource',
            'content': f'您近7天平均情绪评分为{avg_emotion:.1f}分，连续{consecutive_low}天情绪偏低或连续{consecutive_sleep_deficit}天睡眠严重不足，强烈建议尽快联系专业心理咨询师或拨打心理援助热线，您不需要独自承受。',
            'priority': 'urgent',
        })

    if avg_sleep < 5 or avg_quality < 4:
        sleep_desc = []
        if avg_sleep < 5:
            sleep_desc.append(f'近7天平均睡眠时长仅{avg_sleep:.1f}小时')
        if avg_quality < 4:
            sleep_desc.append(f'睡眠质量均分为{avg_quality:.1f}分（满分10分）')
        suggestions.append({
            'category': 'rest_reminder',
            'content': f'{"，".join(sleep_desc)}。建议：①宝宝睡觉时尽量同步休息，不要做家务；②与家人商量轮班照顾宝宝，确保您每天有至少5小时连续睡眠；③睡前避免使用手机，可尝试温水泡脚或轻音乐助眠。',
            'priority': 'urgent' if consecutive_sleep_deficit >= 3 else 'normal',
        })
    elif avg_sleep < 6 or avg_quality < 6:
        suggestions.append({
            'category': 'rest_reminder',
            'content': f'近7天平均睡眠{avg_sleep:.1f}小时，睡眠质量{avg_quality:.1f}分，略低于理想水平。建议：①争取在白天宝宝小睡时补充1-2次短觉；②晚间减少光线和噪音干扰；③与伴侣协商分担夜间喂奶任务。',
            'priority': 'normal',
        })

    if top_stress:
        stress_names = [f'"{name}"（{count}次）' for name, count in top_stress]
        stress_text = '、'.join(stress_names)
        coping_map = {
            '喂奶': '喂奶压力较大时：①尝试不同哺乳姿势减轻身体负担；②如条件允许可考虑吸奶+瓶喂，让伴侣分担喂奶；③哺乳时看些轻松的内容转移注意力。',
            '哄睡': '哄睡压力较大时：①尝试白噪音或轻柔摇篮曲辅助宝宝入睡；②建立固定的睡前仪式，帮助宝宝形成睡眠规律；③如宝宝持续哭闹，可暂时将宝宝放在安全的地方，自己先深呼吸几分钟。',
            '健康担忧': '对宝宝健康感到担忧时：①定期带宝宝体检，用专业意见替代焦虑猜测；②记录宝宝日常数据，用客观事实缓解不安；③与其他妈妈交流，很多担忧是共通的。',
            '身体恢复': '身体恢复压力较大时：①产后恢复需要时间，不要急于回到孕前状态；②做适合产后的轻柔运动，如产后瑜伽、散步；③如有疼痛或不适，及时就医咨询。',
            '情绪波动': '情绪波动较大时：①接纳自己的情绪，产后激素变化是正常现象；②每天给自己10分钟独处时间；③记录情绪日记，有助于发现情绪变化规律。',
            '社交隔离': '感到社交隔离时：①加入本地妈妈群或线上互助社区；②每周至少安排一次与朋友的联系；③带宝宝到社区活动中心，认识其他妈妈。',
            '家庭关系': '家庭关系有压力时：①与伴侣坦诚沟通感受和需求；②适当让家人分担家务和育儿；③如矛盾持续，可考虑家庭咨询。',
            '经济压力': '经济压力较大时：①列出必要开支和可缩减项目；②了解当地生育补贴和育儿优惠政策；③与其他妈妈交流省钱经验。',
        }
        primary_stress = top_stress[0][0]
        coping_tip = coping_map.get(primary_stress, f'关于{primary_stress}压力，建议：①把大问题拆解为小步骤逐一解决；②向信任的人倾诉您的感受；③允许自己暂时放下无法立即解决的问题。')
        suggestions.append({
            'category': 'stress_coping',
            'content': f'近7天主要压力来源为{stress_text}。{coping_tip}',
            'priority': 'urgent' if consecutive_low >= 3 else 'normal',
        })

    if used_support:
        support_text = '、'.join([f'{name}（{count}次）' for name, count in used_support])
        suggestions.append({
            'category': 'support_contact',
            'content': f'近7天您使用了以下支持：{support_text}，继续保持！如果觉得某些支持方式特别有帮助，可以更频繁地使用。',
            'priority': 'normal',
        })

    unused_list = unused_support
    if unused_list or not used_support:
        if not used_support:
            contact_tip = '近7天您尚未记录使用任何支持系统。建议尝试以下支持：①与伴侣倾诉您的感受和需求；②联系家人帮忙照顾宝宝，给自己喘息时间；③加入线上妈妈互助群，与有相似经历的人交流。'
        else:
            contact_tip = f'您还可以尝试以下支持渠道：{"、".join(unused_list)}。有时候换一种支持方式会带来新的帮助。'
        suggestions.append({
            'category': 'support_contact',
            'content': contact_tip,
            'priority': 'normal',
        })

    if not need_urgent:
        general_resources = CounselingResource.query.filter_by(is_emergency=False).all()
        if general_resources:
            res = general_resources[0]
            suggestions.append({
                'category': 'psych_resource',
                'content': f'推荐资源：{res.title}——{res.description}（联系方式：{res.contact}）。在需要时随时寻求专业支持。',
                'priority': 'normal',
            })

    if baby_data:
        baby_tips = []
        if baby_data['avg_sleep'] < 10:
            baby_tips.append(f'宝宝近7天平均每天睡眠{baby_data["avg_sleep"]:.1f}小时，偏少。建议：①检查睡眠环境是否安静舒适；②建立固定的睡前流程；③白天适当增加活动量帮助夜间睡眠。')
        if baby_data['avg_crying'] > 120:
            baby_tips.append(f'宝宝近7天平均每天哭闹{baby_data["avg_crying"]:.0f}分钟，较长。建议：①排查是否饿了、尿布湿了或需要安抚；②尝试襁褓包裹和白噪音；③如持续哭闹难以安抚，建议咨询儿科医生。')
        elif baby_data['avg_crying'] > 60:
            baby_tips.append(f'宝宝近7天平均每天哭闹{baby_data["avg_crying"]:.0f}分钟。建议观察哭闹时间段是否有规律，尝试提前预防。')
        if baby_data['avg_feed'] < 6:
            baby_tips.append(f'宝宝近7天平均每天喂奶{baby_data["avg_feed"]:.1f}次，偏少。建议关注宝宝体重增长情况，必要时咨询医生。')
        if baby_tips:
            suggestions.append({
                'category': 'baby_schedule',
                'content': '\n'.join(baby_tips),
                'priority': 'normal',
            })

    if not suggestions:
        suggestions.append({
            'category': 'rest_reminder',
            'content': '今日暂无特别预警。保持规律作息，继续记录每日情绪和睡眠数据，系统会根据您的数据提供个性化建议。',
            'priority': 'normal',
        })

    return suggestions


@care_bp.route('/today', methods=['GET'])
def get_today_suggestions():
    user_id = request.args.get('user_id', 1, type=int)
    today = date.today()

    existing = CareSuggestion.query.filter_by(
        user_id=user_id,
        suggestion_date=today
    ).all()

    if existing:
        result = []
        for s in existing:
            result.append({
                'id': s.id,
                'suggestion_date': s.suggestion_date.isoformat(),
                'category': s.category,
                'category_label': CATEGORIES.get(s.category, s.category),
                'content': s.content,
                'status': s.status,
                'priority': s.priority,
            })
        return jsonify({'success': True, 'data': result})

    raw_suggestions = generate_suggestions(user_id)

    new_records = []
    for item in raw_suggestions:
        record = CareSuggestion(
            user_id=user_id,
            suggestion_date=today,
            category=item['category'],
            content=item['content'],
            status='pending',
            priority=item.get('priority', 'normal'),
        )
        db.session.add(record)
        new_records.append(record)

    db.session.commit()

    result = []
    for s in new_records:
        result.append({
            'id': s.id,
            'suggestion_date': s.suggestion_date.isoformat(),
            'category': s.category,
            'category_label': CATEGORIES.get(s.category, s.category),
            'content': s.content,
            'status': s.status,
            'priority': s.priority,
        })

    return jsonify({'success': True, 'data': result})


@care_bp.route('/mark', methods=['POST'])
def mark_suggestion():
    data = request.get_json()
    suggestion_id = data.get('suggestion_id')
    status = data.get('status')

    if not suggestion_id or status not in ('completed', 'skipped', 'pending'):
        return jsonify({'success': False, 'message': '参数无效'}), 400

    suggestion = CareSuggestion.query.get(suggestion_id)
    if not suggestion:
        return jsonify({'success': False, 'message': '建议不存在'}), 404

    suggestion.status = status
    from datetime import datetime
    suggestion.updated_at = datetime.now()
    db.session.commit()

    return jsonify({'success': True, 'data': {'id': suggestion.id, 'status': suggestion.status}})


@care_bp.route('/stats', methods=['GET'])
def get_care_stats():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 7, type=int)
    start_date = date.today() - timedelta(days=days - 1)

    suggestions = CareSuggestion.query.filter(
        CareSuggestion.user_id == user_id,
        CareSuggestion.suggestion_date >= start_date
    ).all()

    if not suggestions:
        return jsonify({
            'success': True,
            'data': {
                'total': 0,
                'completed': 0,
                'skipped': 0,
                'pending': 0,
                'completion_rate': 0,
                'daily_rates': [],
                'category_distribution': [],
            }
        })

    total = len(suggestions)
    completed = len([s for s in suggestions if s.status == 'completed'])
    skipped = len([s for s in suggestions if s.status == 'skipped'])
    pending = len([s for s in suggestions if s.status == 'pending'])
    completion_rate = round(completed / total * 100, 1) if total > 0 else 0

    date_map = defaultdict(list)
    for s in suggestions:
        date_map[s.suggestion_date.isoformat()].append(s)

    daily_rates = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        d_str = d.isoformat()
        day_items = date_map.get(d_str, [])
        day_total = len(day_items)
        day_completed = len([s for s in day_items if s.status == 'completed'])
        rate = round(day_completed / day_total * 100, 1) if day_total > 0 else 0
        daily_rates.append({
            'date': d_str,
            'total': day_total,
            'completed': day_completed,
            'rate': rate,
        })

    category_counter = Counter(s.category for s in suggestions)
    category_distribution = []
    for cat, count in category_counter.most_common():
        cat_completed = len([s for s in suggestions if s.category == cat and s.status == 'completed'])
        category_distribution.append({
            'category': cat,
            'category_label': CATEGORIES.get(cat, cat),
            'count': count,
            'completed': cat_completed,
            'percentage': round(count / total * 100, 1),
        })

    return jsonify({
        'success': True,
        'data': {
            'total': total,
            'completed': completed,
            'skipped': skipped,
            'pending': pending,
            'completion_rate': completion_rate,
            'daily_rates': daily_rates,
            'category_distribution': category_distribution,
        }
    })


@care_bp.route('/history', methods=['GET'])
def get_care_history():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 7, type=int)
    start_date = date.today() - timedelta(days=days - 1)

    suggestions = CareSuggestion.query.filter(
        CareSuggestion.user_id == user_id,
        CareSuggestion.suggestion_date >= start_date
    ).order_by(CareSuggestion.suggestion_date.desc(), CareSuggestion.id.asc()).all()

    result = []
    for s in suggestions:
        result.append({
            'id': s.id,
            'suggestion_date': s.suggestion_date.isoformat(),
            'category': s.category,
            'category_label': CATEGORIES.get(s.category, s.category),
            'content': s.content,
            'status': s.status,
            'priority': s.priority,
        })

    return jsonify({'success': True, 'data': result})
