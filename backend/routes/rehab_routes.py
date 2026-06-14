from flask import Blueprint, request, jsonify
from datetime import date, timedelta, datetime
from collections import defaultdict, Counter
from models import (
    db, RehabTrainingRecord, RehabGoal, RehabContraindication,
    RehabAlert, CounselingResource, EmotionRecord, BabySchedule,
    FeedingRecord, Medication, PostpartumVisit
)

rehab_bp = Blueprint('rehab', __name__)

TRAINING_TYPES = {
    'pelvic_floor': {
        'label': '盆底肌训练',
        'icon': '🌸',
        'default_duration': 15,
        'default_intensity': 2,
        'description': '凯格尔运动、盆底肌收缩练习'
    },
    'diastasis_recti': {
        'label': '腹直肌修复',
        'icon': '💪',
        'default_duration': 20,
        'default_intensity': 2,
        'description': '腹式呼吸、核心肌群激活'
    },
    'stretch_walk': {
        'label': '拉伸散步',
        'icon': '🚶',
        'default_duration': 30,
        'default_intensity': 2,
        'description': '轻度拉伸、缓慢散步'
    },
    'breath_relax': {
        'label': '呼吸放松',
        'icon': '🧘',
        'default_duration': 10,
        'default_intensity': 1,
        'description': '深呼吸、冥想放松练习'
    },
    'yoga': {
        'label': '产后瑜伽',
        'icon': '🧘‍♀️',
        'default_duration': 30,
        'default_intensity': 2,
        'description': '温和的产后恢复瑜伽'
    },
    'strength': {
        'label': '力量训练',
        'icon': '🏋️',
        'default_duration': 20,
        'default_intensity': 3,
        'description': '轻重量力量训练'
    },
    'cardio': {
        'label': '有氧运动',
        'icon': '🏃',
        'default_duration': 25,
        'default_intensity': 3,
        'description': '快走、慢跑等有氧运动'
    },
    'other': {
        'label': '其他训练',
        'icon': '✨',
        'default_duration': 15,
        'default_intensity': 2,
        'description': '其他康复训练项目'
    }
}

INTENSITY_LABELS = {
    1: '非常轻松',
    2: '轻松',
    3: '适中',
    4: '稍强',
    5: '高强度'
}

PAIN_LEVEL_LABELS = {
    0: '无痛',
    1: '轻微',
    2: '轻度',
    3: '中度',
    4: '较重',
    5: '严重'
}

GOAL_TYPE_LABELS = {
    'daily_training_minutes': '每日训练时长',
    'weekly_training_days': '每周训练天数',
    'pelvic_floor_strength': '盆底肌力量等级',
    'diastasis_recti_gap': '腹直肌分离距离',
    'daily_steps': '每日步数',
    'pain_level': '疼痛程度控制',
    'weekly_yoga_sessions': '每周瑜伽次数',
    'sleep_quality': '睡眠质量提升'
}

SOURCE_LABELS = {
    'doctor': '医生',
    'therapist': '康复师',
    'nurse': '护士',
    'self': '自我总结',
    'other': '其他'
}


def _parse_date(s):
    try:
        return datetime.strptime(s, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None


def _get_emergency_resources(limit=3):
    resources = CounselingResource.query.filter_by(is_emergency=True).limit(limit).all()
    return [{'title': r.title, 'contact': r.contact, 'type': r.type} for r in resources]


def _get_7day_emotion_data(user_id):
    today = date.today()
    start_date = today - timedelta(days=6)
    records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= start_date,
        EmotionRecord.record_date <= today
    ).order_by(EmotionRecord.record_date).all()
    
    emotion_scores = [r.emotion_score for r in records]
    sleep_qualities = [r.sleep_quality for r in records]
    sleep_hours_list = [r.sleep_hours for r in records]
    
    return {
        'avg_emotion': round(sum(emotion_scores) / len(emotion_scores), 1) if emotion_scores else None,
        'avg_sleep_quality': round(sum(sleep_qualities) / len(sleep_qualities), 1) if sleep_qualities else None,
        'avg_sleep_hours': round(sum(sleep_hours_list) / len(sleep_hours_list), 1) if sleep_hours_list else None,
        'low_emotion_days': sum(1 for s in emotion_scores if s < 4),
        'poor_sleep_days': sum(1 for s in sleep_qualities if s < 3),
        'record_days': len(records)
    }


def _get_7day_baby_data(user_id):
    today = date.today()
    start_date = today - timedelta(days=6)
    schedules = BabySchedule.query.filter(
        BabySchedule.user_id == user_id,
        BabySchedule.record_date >= start_date,
        BabySchedule.record_date <= today
    ).all()
    
    sleep_hours = [s.sleep_total_hours for s in schedules if s.sleep_total_hours > 0]
    feed_counts = [s.feed_count for s in schedules if s.feed_count > 0]
    crying_durations = [s.crying_duration for s in schedules]
    
    return {
        'avg_baby_sleep': round(sum(sleep_hours) / len(sleep_hours), 1) if sleep_hours else None,
        'avg_feed_count': round(sum(feed_counts) / len(feed_counts), 1) if feed_counts else None,
        'avg_crying_minutes': round(sum(crying_durations) / len(crying_durations), 1) if crying_durations else None,
        'record_days': len(schedules)
    }


def _get_medication_data(user_id):
    active_meds = Medication.query.filter_by(
        user_id=user_id, is_active=True
    ).all()
    return {
        'active_medication_count': len(active_meds),
        'medications': [{'id': m.id, 'name': m.name, 'category': m.category} for m in active_meds]
    }


def _get_visit_data(user_id):
    today = date.today()
    recent_visits = PostpartumVisit.query.filter(
        PostpartumVisit.user_id == user_id,
        PostpartumVisit.visit_date >= today - timedelta(days=30)
    ).order_by(PostpartumVisit.visit_date.desc()).all()
    
    pending_visits = [v for v in recent_visits if v.status == 'pending']
    
    return {
        'recent_visit_count': len(recent_visits),
        'pending_visit_count': len(pending_visits),
        'last_visit_date': recent_visits[0].visit_date.isoformat() if recent_visits else None
    }


def _get_feeding_data(user_id):
    today = date.today()
    start_date = today - timedelta(days=6)
    records = FeedingRecord.query.filter(
        FeedingRecord.user_id == user_id,
        FeedingRecord.feed_time >= datetime.combine(start_date, datetime.min.time()),
        FeedingRecord.feed_time <= datetime.combine(today, datetime.max.time())
    ).all()
    
    return {
        'total_feed_count': len(records),
        'avg_daily_feeds': round(len(records) / 7, 1),
        'breastfeeding_count': sum(1 for r in records if r.feed_type == 'breast')
    }


def generate_rehab_suggestions(user_id):
    suggestions = {
        'intensity_suggestion': 2,
        'intensity_label': '轻松',
        'rest_reminders': [],
        'risk_warnings': [],
        'support_contacts': [],
        'training_recommendations': []
    }
    
    emotion_data = _get_7day_emotion_data(user_id)
    baby_data = _get_7day_baby_data(user_id)
    medication_data = _get_medication_data(user_id)
    visit_data = _get_visit_data(user_id)
    feeding_data = _get_feeding_data(user_id)
    
    recent_records = RehabTrainingRecord.query.filter(
        RehabTrainingRecord.user_id == user_id,
        RehabTrainingRecord.record_date >= date.today() - timedelta(days=7)
    ).order_by(RehabTrainingRecord.record_date.desc()).all()
    
    avg_pain = 0
    pain_records = [r for r in recent_records if r.pain_level > 0]
    if pain_records:
        avg_pain = sum(r.pain_level for r in pain_records) / len(pain_records)
    
    high_pain_records = [r for r in recent_records if r.pain_level >= 4]
    leakage_records = [r for r in recent_records if r.has_leakage]
    dizziness_records = [r for r in recent_records if r.has_dizziness]
    
    consecutive_no_training_days = 0
    today = date.today()
    for i in range(1, 8):
        check_date = today - timedelta(days=i)
        has_training = any(r.record_date == check_date and r.completed for r in recent_records)
        if not has_training:
            consecutive_no_training_days += 1
        else:
            break
    
    base_intensity = 2
    
    if emotion_data.get('avg_emotion') and emotion_data['avg_emotion'] < 4:
        base_intensity = max(1, base_intensity - 1)
        suggestions['training_recommendations'].append({
            'type': 'breath_relax',
            'reason': f'近7天平均情绪评分较低（{emotion_data["avg_emotion"]}分），建议优先进行呼吸放松练习'
        })
    else:
        suggestions['training_recommendations'].append({
            'type': 'pelvic_floor',
            'reason': '盆底肌训练是产后康复的核心，建议每日坚持'
        })
    
    if emotion_data.get('avg_sleep_hours') and emotion_data['avg_sleep_hours'] < 5:
        base_intensity = max(1, base_intensity - 1)
        suggestions['rest_reminders'].append(f'近7天平均睡眠不足5小时（{emotion_data["avg_sleep_hours"]}小时），建议减少训练强度，优先保证休息')
    
    if emotion_data.get('poor_sleep_days', 0) >= 3:
        suggestions['rest_reminders'].append(f'近7天有{emotion_data["poor_sleep_days"]}天睡眠质量较差，训练时注意量力而行')
    
    if baby_data.get('avg_crying_minutes') and baby_data['avg_crying_minutes'] > 60:
        base_intensity = max(1, base_intensity - 1)
        suggestions['rest_reminders'].append(f'宝宝近期哭闹较多（日均{baby_data["avg_crying_minutes"]}分钟），妈妈可能比较疲惫，训练以轻松为主')
    
    if medication_data['active_medication_count'] > 0:
        suggestions['rest_reminders'].append(f'正在服用{medication_data["active_medication_count"]}种药物，训练前请注意查看药物说明，如有不适立即停止')
    
    if avg_pain >= 3:
        base_intensity = max(1, base_intensity - 1)
        suggestions['risk_warnings'].append({
            'level': 'warn',
            'title': '训练后疼痛较明显',
            'content': f'近7天训练后平均疼痛程度为{round(avg_pain, 1)}分（满分5分），建议降低训练强度，如疼痛持续请咨询医生'
        })
    
    if len(high_pain_records) >= 2:
        suggestions['risk_warnings'].append({
            'level': 'urgent',
            'title': '⚠️ 多次出现重度疼痛',
            'content': f'近7天有{len(high_pain_records)}次训练后出现重度疼痛（4分以上），建议暂停训练并及时联系医生或康复师'
        })
        suggestions['support_contacts'].extend(_get_emergency_resources(2))
    
    if len(leakage_records) >= 3:
        severe_leakage = [r for r in leakage_records if r.leakage_severity >= 3]
        if severe_leakage:
            suggestions['risk_warnings'].append({
                'level': 'urgent',
                'title': '⚠️ 漏尿情况加重',
                'content': f'近7天有{len(leakage_records)}次训练后出现漏尿，其中{len(severe_leakage)}次较严重，建议及时咨询妇科或康复科医生'
            })
            suggestions['support_contacts'].extend(_get_emergency_resources(2))
        else:
            suggestions['risk_warnings'].append({
                'level': 'warn',
                'title': '训练时出现漏尿',
                'content': f'近7天有{len(leakage_records)}次训练后出现漏尿，建议调整训练方式，重点进行盆底肌训练'
            })
    
    if len(dizziness_records) >= 2:
        suggestions['risk_warnings'].append({
            'level': 'urgent',
            'title': '⚠️ 频繁出现头晕乏力',
            'content': f'近7天有{len(dizziness_records)}次训练后出现头晕乏力，建议暂停高强度训练，注意补充营养和休息，如持续请就医检查'
        })
        suggestions['support_contacts'].extend(_get_emergency_resources(2))
    
    if consecutive_no_training_days >= 5:
        suggestions['risk_warnings'].append({
            'level': 'warn',
            'title': '连续多日未训练',
            'content': f'已连续{consecutive_no_training_days}天没有进行康复训练，建议从低强度慢慢恢复，不要突然加大运动量'
        })
    
    if visit_data['pending_visit_count'] > 0:
        suggestions['rest_reminders'].append(f'有{visit_data["pending_visit_count"]}项待复诊，复诊时可咨询医生关于康复训练的建议')
    
    if feeding_data['breastfeeding_count'] > 0:
        suggestions['training_recommendations'].append({
            'type': 'stretch_walk',
            'reason': '母乳喂养期间，适度的拉伸和散步有助于身体恢复且不影响泌乳'
        })
    
    suggestions['intensity_suggestion'] = base_intensity
    suggestions['intensity_label'] = INTENSITY_LABELS.get(base_intensity, '轻松')
    
    if not suggestions['rest_reminders']:
        suggestions['rest_reminders'].append('训练前记得热身，训练后记得拉伸放松')
        suggestions['rest_reminders'].append('循序渐进，量力而行，身体感到不适时立即停止')
    
    unique_support = []
    seen_titles = set()
    for s in suggestions['support_contacts']:
        if s['title'] not in seen_titles:
            unique_support.append(s)
            seen_titles.add(s['title'])
    suggestions['support_contacts'] = unique_support[:3]
    
    return suggestions


def generate_rehab_alerts(user_id):
    alerts = []
    today = date.today()
    
    recent_records = RehabTrainingRecord.query.filter(
        RehabTrainingRecord.user_id == user_id,
        RehabTrainingRecord.record_date >= today - timedelta(days=7)
    ).order_by(RehabTrainingRecord.record_date.desc()).all()
    
    if not recent_records:
        return []
    
    high_pain_records = [r for r in recent_records if r.pain_level >= 4]
    leakage_records = [r for r in recent_records if r.has_leakage]
    severe_leakage = [r for r in leakage_records if r.leakage_severity >= 3]
    dizziness_records = [r for r in recent_records if r.has_dizziness]
    fatigue_records = [r for r in recent_records if r.has_fatigue]
    
    consecutive_pain_days = 0
    last_date = None
    for r in recent_records:
        if r.pain_level >= 3:
            if last_date is None or (last_date - r.record_date).days <= 1:
                consecutive_pain_days += 1
            else:
                consecutive_pain_days = 1
            last_date = r.record_date
    
    existing_alerts = RehabAlert.query.filter(
        RehabAlert.user_id == user_id,
        RehabAlert.alert_date == today
    ).all()
    existing_types = {a.alert_type for a in existing_alerts}
    
    emergency_resources = _get_emergency_resources(3)
    
    if len(high_pain_records) >= 2 and 'severe_pain' not in existing_types:
        resources_json = str(emergency_resources)
        alert = RehabAlert(
            user_id=user_id,
            alert_type='severe_pain',
            level='urgent',
            title='⚠️ 训练后重度疼痛警告',
            content=f'近7天有{len(high_pain_records)}次训练后出现重度疼痛（4分以上）。'
                    f'建议立即暂停训练，注意休息。如疼痛持续或加重，请及时联系医生或康复师。',
            alert_date=today,
            resources_pushed=resources_json,
            support_contacts=resources_json
        )
        db.session.add(alert)
    
    if len(severe_leakage) >= 2 and 'severe_leakage' not in existing_types:
        resources_json = str(emergency_resources)
        alert = RehabAlert(
            user_id=user_id,
            alert_type='severe_leakage',
            level='urgent',
            title='⚠️ 漏尿加重警告',
            content=f'近7天有{len(severe_leakage)}次训练后出现较严重的漏尿。'
                    f'建议暂停增加腹压的训练，重点进行盆底肌修复练习。请及时咨询妇科或康复科医生。',
            alert_date=today,
            resources_pushed=resources_json,
            support_contacts=resources_json
        )
        db.session.add(alert)
    
    if len(dizziness_records) >= 2 and 'frequent_dizziness' not in existing_types:
        resources_json = str(emergency_resources)
        alert = RehabAlert(
            user_id=user_id,
            alert_type='frequent_dizziness',
            level='urgent',
            title='⚠️ 频繁头晕乏力警告',
            content=f'近7天有{len(dizziness_records)}次训练后出现头晕乏力。'
                    f'可能与身体虚弱、贫血或血压异常有关。建议暂停高强度训练，注意补充营养和充分休息。'
                    f'如症状持续，请及时就医检查。',
            alert_date=today,
            resources_pushed=resources_json,
            support_contacts=resources_json
        )
        db.session.add(alert)
    
    if consecutive_pain_days >= 3 and 'consecutive_pain' not in existing_types:
        resources_json = str(emergency_resources[:2])
        alert = RehabAlert(
            user_id=user_id,
            alert_type='consecutive_pain',
            level='warn',
            title='连续多日训练后疼痛',
            content=f'已连续{consecutive_pain_days}天训练后出现疼痛（3分以上）。'
                    f'身体可能需要更多恢复时间，建议降低训练强度或休息1-2天。',
            alert_date=today,
            resources_pushed=resources_json,
            support_contacts=resources_json
        )
        db.session.add(alert)
    
    db.session.commit()
    
    all_alerts = RehabAlert.query.filter(
        RehabAlert.user_id == user_id,
        RehabAlert.is_acknowledged == False
    ).order_by(RehabAlert.created_at.desc()).all()
    
    result = []
    for a in all_alerts:
        resources = []
        try:
            resources = eval(a.resources_pushed) if a.resources_pushed else []
        except:
            pass
        support_contacts = []
        try:
            support_contacts = eval(a.support_contacts) if a.support_contacts else []
        except:
            pass
        result.append({
            'id': a.id,
            'alert_type': a.alert_type,
            'level': a.level,
            'title': a.title,
            'content': a.content,
            'alert_date': a.alert_date.isoformat(),
            'is_acknowledged': a.is_acknowledged,
            'resources': resources,
            'support_contacts': support_contacts
        })
    
    return result


@rehab_bp.route('/today', methods=['GET'])
def get_today():
    user_id = request.args.get('user_id', 1, type=int)
    today = date.today()
    
    today_records = RehabTrainingRecord.query.filter_by(
        user_id=user_id, record_date=today
    ).order_by(RehabTrainingRecord.created_at.desc()).all()
    
    records_data = []
    for r in today_records:
        records_data.append({
            'id': r.id,
            'training_type': r.training_type,
            'training_type_label': r.training_type_label or TRAINING_TYPES.get(r.training_type, {}).get('label', r.training_type),
            'duration_minutes': r.duration_minutes,
            'intensity': r.intensity,
            'intensity_label': INTENSITY_LABELS.get(r.intensity, ''),
            'completed': r.completed,
            'pain_level': r.pain_level,
            'pain_level_label': PAIN_LEVEL_LABELS.get(r.pain_level, ''),
            'has_leakage': r.has_leakage,
            'leakage_severity': r.leakage_severity,
            'has_dizziness': r.has_dizziness,
            'has_fatigue': r.has_fatigue,
            'other_symptoms': r.other_symptoms,
            'note': r.note,
            'created_at': r.created_at.isoformat()
        })
    
    suggestions = generate_rehab_suggestions(user_id)
    alerts = generate_rehab_alerts(user_id)
    
    active_goals = RehabGoal.query.filter_by(
        user_id=user_id, status='active'
    ).all()
    
    goals_data = []
    for g in active_goals:
        completion_rate = 0
        if g.target_value > 0:
            completion_rate = round(min(g.current_value / g.target_value * 100, 100), 1)
        goals_data.append({
            'id': g.id,
            'goal_type': g.goal_type,
            'goal_type_label': g.goal_type_label or GOAL_TYPE_LABELS.get(g.goal_type, g.goal_type),
            'target_value': g.target_value,
            'current_value': g.current_value,
            'unit': g.unit,
            'completion_rate': completion_rate,
            'description': g.description
        })
    
    active_contraindications = RehabContraindication.query.filter_by(
        user_id=user_id, is_active=True
    ).all()
    
    contra_data = [
        {
            'id': c.id,
            'content': c.content,
            'source': c.source,
            'source_label': SOURCE_LABELS.get(c.source, c.source),
            'source_name': c.source_name,
            'note': c.note
        }
        for c in active_contraindications
    ]
    
    total_duration = sum(r['duration_minutes'] for r in records_data if r['completed'])
    completed_count = sum(1 for r in records_data if r['completed'])
    
    need_urgent = any(a['level'] == 'urgent' for a in alerts)
    
    return jsonify({
        'success': True,
        'data': {
            'date': today.isoformat(),
            'records': records_data,
            'summary': {
                'total_count': len(records_data),
                'completed_count': completed_count,
                'total_duration': total_duration
            },
            'suggestions': suggestions,
            'alerts': alerts,
            'active_goals': goals_data,
            'contraindications': contra_data,
            'need_urgent': need_urgent,
            'training_types': [
                {
                    'type': k,
                    'label': v['label'],
                    'icon': v['icon'],
                    'default_duration': v['default_duration'],
                    'default_intensity': v['default_intensity'],
                    'description': v['description']
                }
                for k, v in TRAINING_TYPES.items()
            ]
        }
    })


@rehab_bp.route('/records', methods=['GET'])
def get_records():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)
    training_type = request.args.get('training_type')
    
    today = date.today()
    start_date = today - timedelta(days=days - 1)
    
    query = RehabTrainingRecord.query.filter(
        RehabTrainingRecord.user_id == user_id,
        RehabTrainingRecord.record_date >= start_date,
        RehabTrainingRecord.record_date <= today
    )
    
    if training_type:
        query = query.filter_by(training_type=training_type)
    
    records = query.order_by(RehabTrainingRecord.record_date.desc(), RehabTrainingRecord.created_at.desc()).all()
    
    records_data = []
    for r in records:
        records_data.append({
            'id': r.id,
            'training_type': r.training_type,
            'training_type_label': r.training_type_label or TRAINING_TYPES.get(r.training_type, {}).get('label', r.training_type),
            'record_date': r.record_date.isoformat(),
            'duration_minutes': r.duration_minutes,
            'intensity': r.intensity,
            'intensity_label': INTENSITY_LABELS.get(r.intensity, ''),
            'completed': r.completed,
            'pain_level': r.pain_level,
            'pain_level_label': PAIN_LEVEL_LABELS.get(r.pain_level, ''),
            'has_leakage': r.has_leakage,
            'leakage_severity': r.leakage_severity,
            'has_dizziness': r.has_dizziness,
            'has_fatigue': r.has_fatigue,
            'other_symptoms': r.other_symptoms,
            'note': r.note,
            'created_at': r.created_at.isoformat()
        })
    
    return jsonify({
        'success': True,
        'data': records_data
    })


@rehab_bp.route('/records', methods=['POST'])
def add_record():
    data = request.get_json()
    user_id = data.get('user_id', 1)
    
    training_type = data.get('training_type', 'other')
    type_info = TRAINING_TYPES.get(training_type, {})
    
    record = RehabTrainingRecord(
        user_id=user_id,
        record_date=_parse_date(data.get('record_date')) or date.today(),
        training_type=training_type,
        training_type_label=type_info.get('label', training_type),
        duration_minutes=data.get('duration_minutes', type_info.get('default_duration', 15)),
        intensity=data.get('intensity', type_info.get('default_intensity', 2)),
        completed=data.get('completed', True),
        pain_level=data.get('pain_level', 0),
        has_leakage=data.get('has_leakage', False),
        leakage_severity=data.get('leakage_severity', 0),
        has_dizziness=data.get('has_dizziness', False),
        has_fatigue=data.get('has_fatigue', False),
        other_symptoms=data.get('other_symptoms', ''),
        note=data.get('note', '')
    )
    
    db.session.add(record)
    db.session.commit()
    
    generate_rehab_alerts(user_id)
    
    return jsonify({
        'success': True,
        'data': {
            'id': record.id,
            'message': '训练记录添加成功'
        }
    })


@rehab_bp.route('/records/<int:record_id>', methods=['PUT'])
def update_record(record_id):
    data = request.get_json()
    record = RehabTrainingRecord.query.get(record_id)
    
    if not record:
        return jsonify({'success': False, 'message': '记录不存在'}), 404
    
    if 'training_type' in data:
        record.training_type = data['training_type']
        type_info = TRAINING_TYPES.get(data['training_type'], {})
        record.training_type_label = type_info.get('label', data['training_type'])
    
    if 'record_date' in data:
        d = _parse_date(data['record_date'])
        if d:
            record.record_date = d
    
    if 'duration_minutes' in data:
        record.duration_minutes = data['duration_minutes']
    if 'intensity' in data:
        record.intensity = data['intensity']
    if 'completed' in data:
        record.completed = data['completed']
    if 'pain_level' in data:
        record.pain_level = data['pain_level']
    if 'has_leakage' in data:
        record.has_leakage = data['has_leakage']
    if 'leakage_severity' in data:
        record.leakage_severity = data['leakage_severity']
    if 'has_dizziness' in data:
        record.has_dizziness = data['has_dizziness']
    if 'has_fatigue' in data:
        record.has_fatigue = data['has_fatigue']
    if 'other_symptoms' in data:
        record.other_symptoms = data['other_symptoms']
    if 'note' in data:
        record.note = data['note']
    
    db.session.commit()
    
    generate_rehab_alerts(record.user_id)
    
    return jsonify({
        'success': True,
        'message': '记录更新成功'
    })


@rehab_bp.route('/records/<int:record_id>', methods=['DELETE'])
def delete_record(record_id):
    record = RehabTrainingRecord.query.get(record_id)
    
    if not record:
        return jsonify({'success': False, 'message': '记录不存在'}), 404
    
    user_id = record.user_id
    db.session.delete(record)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '记录删除成功'
    })


@rehab_bp.route('/goals', methods=['GET'])
def get_goals():
    user_id = request.args.get('user_id', 1, type=int)
    status = request.args.get('status')
    
    query = RehabGoal.query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status)
    
    goals = query.order_by(RehabGoal.created_at.desc()).all()
    
    goals_data = []
    for g in goals:
        completion_rate = 0
        if g.target_value > 0:
            completion_rate = round(min(g.current_value / g.target_value * 100, 100), 1)
        achieved = g.current_value >= g.target_value if g.target_value > 0 else False
        goals_data.append({
            'id': g.id,
            'goal_type': g.goal_type,
            'goal_type_label': g.goal_type_label or GOAL_TYPE_LABELS.get(g.goal_type, g.goal_type),
            'target_value': g.target_value,
            'current_value': g.current_value,
            'unit': g.unit,
            'start_date': g.start_date.isoformat() if g.start_date else None,
            'target_date': g.target_date.isoformat() if g.target_date else None,
            'status': g.status,
            'description': g.description,
            'completion_rate': completion_rate,
            'achieved': achieved
        })
    
    return jsonify({
        'success': True,
        'data': goals_data
    })


@rehab_bp.route('/goals', methods=['POST'])
def add_goal():
    data = request.get_json()
    user_id = data.get('user_id', 1)
    
    goal_type = data.get('goal_type', 'daily_training_minutes')
    goal_type_label = data.get('goal_type_label') or GOAL_TYPE_LABELS.get(goal_type, goal_type)
    
    goal = RehabGoal(
        user_id=user_id,
        goal_type=goal_type,
        goal_type_label=goal_type_label,
        target_value=data.get('target_value', 0),
        current_value=data.get('current_value', 0),
        unit=data.get('unit', ''),
        start_date=_parse_date(data.get('start_date')) or date.today(),
        target_date=_parse_date(data.get('target_date')),
        status=data.get('status', 'active'),
        description=data.get('description', '')
    )
    
    db.session.add(goal)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': {'id': goal.id, 'message': '目标添加成功'}
    })


@rehab_bp.route('/goals/<int:goal_id>', methods=['PUT'])
def update_goal(goal_id):
    data = request.get_json()
    goal = RehabGoal.query.get(goal_id)
    
    if not goal:
        return jsonify({'success': False, 'message': '目标不存在'}), 404
    
    for field in ['goal_type', 'target_value', 'current_value', 'unit', 'status', 'description']:
        if field in data:
            setattr(goal, field, data[field])
    
    if 'goal_type' in data:
        goal.goal_type_label = GOAL_TYPE_LABELS.get(data['goal_type'], data['goal_type'])
    
    if 'start_date' in data:
        d = _parse_date(data['start_date'])
        if d:
            goal.start_date = d
    
    if 'target_date' in data:
        goal.target_date = _parse_date(data['target_date'])
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '目标更新成功'
    })


@rehab_bp.route('/goals/<int:goal_id>', methods=['DELETE'])
def delete_goal(goal_id):
    goal = RehabGoal.query.get(goal_id)
    
    if not goal:
        return jsonify({'success': False, 'message': '目标不存在'}), 404
    
    db.session.delete(goal)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '目标删除成功'
    })


@rehab_bp.route('/contraindications', methods=['GET'])
def get_contraindications():
    user_id = request.args.get('user_id', 1, type=int)
    active_only = request.args.get('active_only', type=bool)
    
    query = RehabContraindication.query.filter_by(user_id=user_id)
    if active_only:
        query = query.filter_by(is_active=True)
    
    items = query.order_by(RehabContraindication.created_at.desc()).all()
    
    data = [
        {
            'id': c.id,
            'content': c.content,
            'source': c.source,
            'source_label': SOURCE_LABELS.get(c.source, c.source),
            'source_name': c.source_name,
            'is_active': c.is_active,
            'note': c.note,
            'created_at': c.created_at.isoformat()
        }
        for c in items
    ]
    
    return jsonify({
        'success': True,
        'data': data
    })


@rehab_bp.route('/contraindications', methods=['POST'])
def add_contraindication():
    data = request.get_json()
    user_id = data.get('user_id', 1)
    
    item = RehabContraindication(
        user_id=user_id,
        content=data.get('content', ''),
        source=data.get('source', 'doctor'),
        source_name=data.get('source_name', ''),
        is_active=data.get('is_active', True),
        note=data.get('note', '')
    )
    
    db.session.add(item)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'data': {'id': item.id, 'message': '禁忌事项添加成功'}
    })


@rehab_bp.route('/contraindications/<int:item_id>', methods=['PUT'])
def update_contraindication(item_id):
    data = request.get_json()
    item = RehabContraindication.query.get(item_id)
    
    if not item:
        return jsonify({'success': False, 'message': '记录不存在'}), 404
    
    for field in ['content', 'source', 'source_name', 'is_active', 'note']:
        if field in data:
            setattr(item, field, data[field])
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '禁忌事项更新成功'
    })


@rehab_bp.route('/contraindications/<int:item_id>', methods=['DELETE'])
def delete_contraindication(item_id):
    item = RehabContraindication.query.get(item_id)
    
    if not item:
        return jsonify({'success': False, 'message': '记录不存在'}), 404
    
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '禁忌事项删除成功'
    })


@rehab_bp.route('/alerts', methods=['GET'])
def get_alerts():
    user_id = request.args.get('user_id', 1, type=int)
    all_alerts = request.args.get('all', type=bool)
    
    query = RehabAlert.query.filter_by(user_id=user_id)
    if not all_alerts:
        query = query.filter_by(is_acknowledged=False)
    
    alerts = query.order_by(RehabAlert.created_at.desc()).all()
    
    result = []
    for a in alerts:
        resources = []
        try:
            resources = eval(a.resources_pushed) if a.resources_pushed else []
        except:
            pass
        support_contacts = []
        try:
            support_contacts = eval(a.support_contacts) if a.support_contacts else []
        except:
            pass
        result.append({
            'id': a.id,
            'alert_type': a.alert_type,
            'level': a.level,
            'title': a.title,
            'content': a.content,
            'alert_date': a.alert_date.isoformat(),
            'is_acknowledged': a.is_acknowledged,
            'resources': resources,
            'support_contacts': support_contacts
        })
    
    return jsonify({
        'success': True,
        'data': result
    })


@rehab_bp.route('/alert/acknowledge/<int:alert_id>', methods=['POST'])
def acknowledge_alert(alert_id):
    alert = RehabAlert.query.get(alert_id)
    
    if not alert:
        return jsonify({'success': False, 'message': '提醒不存在'}), 404
    
    alert.is_acknowledged = True
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '已确认提醒'
    })


@rehab_bp.route('/stats', methods=['GET'])
def get_stats():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)
    
    today = date.today()
    start_date = today - timedelta(days=days - 1)
    
    records = RehabTrainingRecord.query.filter(
        RehabTrainingRecord.user_id == user_id,
        RehabTrainingRecord.record_date >= start_date,
        RehabTrainingRecord.record_date <= today
    ).order_by(RehabTrainingRecord.record_date).all()
    
    daily_stats = defaultdict(lambda: {
        'count': 0,
        'completed': 0,
        'duration': 0,
        'avg_pain': 0,
        'pain_count': 0,
        'leakage_count': 0,
        'dizziness_count': 0,
        'fatigue_count': 0
    })
    
    type_count = defaultdict(int)
    type_completed = defaultdict(int)
    type_duration = defaultdict(int)
    
    total_completed = 0
    total_planned = 0
    total_duration = 0
    
    pain_level_counts = Counter()
    body_feedback_dates = []
    
    for r in records:
        d_str = r.record_date.isoformat()
        daily_stats[d_str]['count'] += 1
        total_planned += 1
        
        if r.completed:
            daily_stats[d_str]['completed'] += 1
            daily_stats[d_str]['duration'] += r.duration_minutes
            total_completed += 1
            total_duration += r.duration_minutes
            
            type_completed[r.training_type] += 1
            type_duration[r.training_type] += r.duration_minutes
        
        type_count[r.training_type] += 1
        
        if r.pain_level > 0:
            daily_stats[d_str]['avg_pain'] += r.pain_level
            daily_stats[d_str]['pain_count'] += 1
            pain_level_counts[r.pain_level] += 1
        
        if r.has_leakage:
            daily_stats[d_str]['leakage_count'] += 1
        if r.has_dizziness:
            daily_stats[d_str]['dizziness_count'] += 1
        if r.has_fatigue:
            daily_stats[d_str]['fatigue_count'] += 1
    
    daily_trend = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        d_str = d.isoformat()
        s = daily_stats.get(d_str, {
            'count': 0, 'completed': 0, 'duration': 0,
            'avg_pain': 0, 'pain_count': 0,
            'leakage_count': 0, 'dizziness_count': 0, 'fatigue_count': 0
        })
        avg_pain = round(s['avg_pain'] / s['pain_count'], 1) if s['pain_count'] > 0 else 0
        completion_rate = round(s['completed'] / s['count'] * 100, 1) if s['count'] > 0 else 0
        
        daily_trend.append({
            'date': d_str,
            'total_count': s['count'],
            'completed_count': s['completed'],
            'completion_rate': completion_rate,
            'duration_minutes': s['duration'],
            'avg_pain': avg_pain,
            'pain_count': s['pain_count'],
            'leakage_count': s['leakage_count'],
            'dizziness_count': s['dizziness_count'],
            'fatigue_count': s['fatigue_count']
        })
    
    type_distribution = []
    for t, count in type_count.items():
        type_info = TRAINING_TYPES.get(t, {})
        percentage = round(count / total_planned * 100, 1) if total_planned > 0 else 0
        type_distribution.append({
            'type': t,
            'type_label': type_info.get('label', t),
            'icon': type_info.get('icon', '✨'),
            'count': count,
            'completed': type_completed.get(t, 0),
            'total_duration': type_duration.get(t, 0),
            'percentage': percentage
        })
    
    type_distribution.sort(key=lambda x: x['count'], reverse=True)
    
    completion_rate = round(total_completed / total_planned * 100, 1) if total_planned > 0 else 0
    
    active_days = sum(1 for d in daily_trend if d['completed_count'] > 0)
    
    goals = RehabGoal.query.filter_by(user_id=user_id).all()
    goal_stats = []
    for g in goals:
        completion_rate_goal = 0
        if g.target_value > 0:
            completion_rate_goal = round(min(g.current_value / g.target_value * 100, 100), 1)
        goal_stats.append({
            'id': g.id,
            'goal_type': g.goal_type,
            'goal_type_label': g.goal_type_label or GOAL_TYPE_LABELS.get(g.goal_type, g.goal_type),
            'target_value': g.target_value,
            'current_value': g.current_value,
            'unit': g.unit,
            'status': g.status,
            'completion_rate': completion_rate_goal,
            'achieved': g.current_value >= g.target_value if g.target_value > 0 else False
        })
    
    achieved_goals = sum(1 for g in goal_stats if g['achieved'] and g['status'] == 'active')
    active_goals_count = sum(1 for g in goal_stats if g['status'] == 'active')
    overall_goal_rate = round(achieved_goals / active_goals_count * 100, 1) if active_goals_count > 0 else 0
    
    emotion_data = _get_7day_emotion_data(user_id)
    baby_data = _get_7day_baby_data(user_id)
    
    body_feedback_trend = []
    for d in daily_trend:
        body_feedback_trend.append({
            'date': d['date'],
            'pain_count': d['pain_count'],
            'leakage_count': d['leakage_count'],
            'dizziness_count': d['dizziness_count'],
            'fatigue_count': d['fatigue_count'],
            'avg_pain': d['avg_pain']
        })
    
    pain_distribution = []
    for level in range(6):
        count = pain_level_counts.get(level, 0)
        pain_distribution.append({
            'level': level,
            'level_label': PAIN_LEVEL_LABELS.get(level, str(level)),
            'count': count,
            'percentage': round(count / max(sum(pain_level_counts.values()), 1) * 100, 1)
        })
    
    return jsonify({
        'success': True,
        'data': {
            'period_days': days,
            'overview': {
                'total_training_count': total_planned,
                'completed_count': total_completed,
                'completion_rate': completion_rate,
                'total_duration_minutes': total_duration,
                'avg_daily_duration': round(total_duration / days, 1),
                'active_days': active_days,
                'training_types_count': len(type_distribution)
            },
            'daily_trend': daily_trend,
            'type_distribution': type_distribution,
            'body_feedback_trend': body_feedback_trend,
            'pain_distribution': pain_distribution,
            'goals': {
                'total': len(goals),
                'active': active_goals_count,
                'achieved': achieved_goals,
                'overall_rate': overall_goal_rate,
                'list': goal_stats
            },
            'emotion_sleep_correlation': {
                'avg_emotion_7d': emotion_data.get('avg_emotion'),
                'avg_sleep_quality_7d': emotion_data.get('avg_sleep_quality'),
                'avg_sleep_hours_7d': emotion_data.get('avg_sleep_hours'),
                'low_emotion_days_7d': emotion_data.get('low_emotion_days', 0),
                'poor_sleep_days_7d': emotion_data.get('poor_sleep_days', 0),
                'avg_training_duration_7d': round(sum(d['duration_minutes'] for d in daily_trend[-7:]) / 7, 1) if len(daily_trend) >= 7 else None,
                'avg_baby_sleep_7d': baby_data.get('avg_baby_sleep'),
                'avg_feed_count_7d': baby_data.get('avg_feed_count')
            }
        }
    })


@rehab_bp.route('/history', methods=['GET'])
def get_history():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)
    
    today = date.today()
    start_date = today - timedelta(days=days - 1)
    
    records = RehabTrainingRecord.query.filter(
        RehabTrainingRecord.user_id == user_id,
        RehabTrainingRecord.record_date >= start_date,
        RehabTrainingRecord.record_date <= today
    ).order_by(RehabTrainingRecord.record_date.desc(), RehabTrainingRecord.created_at.desc()).all()
    
    grouped = defaultdict(list)
    for r in records:
        d_str = r.record_date.isoformat()
        type_info = TRAINING_TYPES.get(r.training_type, {})
        grouped[d_str].append({
            'id': r.id,
            'training_type': r.training_type,
            'training_type_label': r.training_type_label or type_info.get('label', r.training_type),
            'icon': type_info.get('icon', '✨'),
            'duration_minutes': r.duration_minutes,
            'intensity': r.intensity,
            'intensity_label': INTENSITY_LABELS.get(r.intensity, ''),
            'completed': r.completed,
            'pain_level': r.pain_level,
            'has_leakage': r.has_leakage,
            'has_dizziness': r.has_dizziness,
            'note': r.note
        })
    
    history = []
    for d_str, day_records in sorted(grouped.items(), reverse=True):
        total_duration = sum(r['duration_minutes'] for r in day_records if r['completed'])
        completed_count = sum(1 for r in day_records if r['completed'])
        has_abnormal = any(
            r['pain_level'] >= 3 or r['has_leakage'] or r['has_dizziness']
            for r in day_records
        )
        history.append({
            'date': d_str,
            'records': day_records,
            'summary': {
                'total_count': len(day_records),
                'completed_count': completed_count,
                'total_duration': total_duration,
                'has_abnormal': has_abnormal
            }
        })
    
    return jsonify({
        'success': True,
        'data': history
    })
