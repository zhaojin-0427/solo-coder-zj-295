from flask import Blueprint, request, jsonify
from datetime import date, timedelta, datetime
from collections import defaultdict, Counter
from models import (
    db, FeedingRecord, BreastCareRecord, LactationGoal,
    LactationAdvice, FeedingAlert, CounselingResource,
    EmotionRecord, BabySchedule
)

feeding_bp = Blueprint('feeding', __name__)

FEED_TYPE_LABELS = {
    'breast': '亲喂',
    'bottle': '瓶喂',
    'pump': '吸奶',
}

BREAST_CARE_TYPE_LABELS = {
    'engorgement': '乳房胀痛',
    'blocked_duct': '堵奶',
    'cracked_nipple': '乳头皲裂',
    'mastitis': '乳腺炎',
    'sore_nipple': '乳头疼痛',
    'other': '其他不适',
}

SEVERITY_LABELS = {
    1: '轻微',
    2: '较轻',
    3: '一般',
    4: '较重',
    5: '严重',
}

ADVISOR_TYPE_LABELS = {
    'doctor': '医生',
    'lactation_consultant': '母乳顾问',
    'nurse': '护士',
    'other': '其他',
}

GOAL_TYPE_LABELS = {
    'daily_feed_count': '每日喂养次数',
    'daily_milk_amount': '每日产奶量(ml)',
    'exclusive_breastfeeding_days': '纯母乳喂养天数',
    'pump_frequency': '每日吸奶次数',
    'water_intake': '每日饮水量(ml)',
    'rest_hours': '每日休息时长(小时)',
}


def _parse_date(s):
    try:
        return datetime.strptime(s, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None


def _parse_datetime(s):
    if not s:
        return datetime.now()
    try:
        return datetime.strptime(s, '%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        pass
    try:
        return datetime.strptime(s, '%Y-%m-%dT%H:%M:%S')
    except (ValueError, TypeError):
        pass
    try:
        return datetime.strptime(s, '%Y-%m-%d %H:%M')
    except (ValueError, TypeError):
        pass
    return datetime.now()


def _get_emergency_resources(limit=3):
    resources = CounselingResource.query.filter_by(is_emergency=True).limit(limit).all()
    return [{'title': r.title, 'contact': r.contact, 'type': r.type} for r in resources]


def _calculate_feeding_stats(user_id, days=7):
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    records = FeedingRecord.query.filter(
        FeedingRecord.user_id == user_id,
        FeedingRecord.feed_time >= datetime.combine(start_date, datetime.min.time()),
        FeedingRecord.feed_time <= datetime.combine(today, datetime.max.time()),
    ).order_by(FeedingRecord.feed_time.desc()).all()

    daily_count = defaultdict(int)
    daily_milk = defaultdict(float)
    daily_duration = defaultdict(int)
    type_count = defaultdict(int)
    side_count = defaultdict(int)
    acceptance_scores = []

    for r in records:
        d = r.feed_time.date().isoformat()
        daily_count[d] += 1
        if r.milk_amount_ml:
            daily_milk[d] += r.milk_amount_ml
        if r.duration_minutes:
            daily_duration[d] += r.duration_minutes
        type_count[r.feed_type] += 1
        if r.breast_side:
            side_count[r.breast_side] += 1
        if r.baby_acceptance:
            acceptance_scores.append(r.baby_acceptance)

    result = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        d_str = d.isoformat()
        result.append({
            'date': d_str,
            'feed_count': daily_count.get(d_str, 0),
            'total_milk_ml': round(daily_milk.get(d_str, 0), 1),
            'total_duration_min': daily_duration.get(d_str, 0),
        })

    avg_acceptance = round(sum(acceptance_scores) / len(acceptance_scores), 1) if acceptance_scores else 0

    return {
        'daily_stats': result,
        'total_records': len(records),
        'avg_daily_count': round(sum(daily_count.values()) / days, 1),
        'type_distribution': {
            t: {'count': c, 'label': FEED_TYPE_LABELS.get(t, t)}
            for t, c in type_count.items()
        },
        'side_distribution': {
            s: c for s, c in side_count.items()
        },
        'avg_baby_acceptance': avg_acceptance,
        'total_milk_ml': round(sum(daily_milk.values()), 1),
    }


def generate_feeding_alerts(user_id):
    alerts = []
    today = date.today()
    now = datetime.now()
    need_urgent = False

    week_stats = _calculate_feeding_stats(user_id, days=7)
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())

    today_records = FeedingRecord.query.filter(
        FeedingRecord.user_id == user_id,
        FeedingRecord.feed_time >= today_start,
        FeedingRecord.feed_time <= today_end,
    ).order_by(FeedingRecord.feed_time.desc()).all()

    today_count = len(today_records)
    avg_daily = week_stats['avg_daily_count']

    if today_count == 0 and now.hour >= 8:
        alerts.append({
            'level': 'warn',
            'category': 'no_feeding_today',
            'title': '今日尚无喂养记录',
            'content': '今天还没有记录任何喂养活动。宝宝的喂养需求很重要，建议您记录每次喂养情况，以便更好地追踪宝宝的营养摄入和您的泌乳状态。',
            'action_hint': '点击"新增记录"开始记录',
        })

    if avg_daily > 0 and today_count < avg_daily * 0.5 and now.hour >= 14:
        alerts.append({
            'level': 'warn',
            'category': 'low_feed_count',
            'title': '今日喂养次数偏少',
            'content': f'您近7天日均喂养{avg_daily}次，但今天截至目前仅{today_count}次。如果宝宝喂养次数明显不足，可能影响宝宝的生长发育，也可能影响您的泌乳量。请关注宝宝的饥饿信号，按需喂养。',
            'action_hint': '如持续偏少建议咨询儿科医生',
        })

    if avg_daily > 0 and today_count < avg_daily * 0.3 and now.hour >= 18:
        emergency_res = _get_emergency_resources(2)
        alerts.append({
            'level': 'urgent',
            'category': 'very_low_feed_count',
            'title': '⚠️ 严重：今日喂养次数严重不足',
            'content': f'您近7天日均喂养{avg_daily}次，但今天截至目前仅{today_count}次，远低于正常水平。新生儿通常每2-3小时需要喂养一次。请立即检查宝宝状态，如宝宝精神萎靡、尿量减少或持续嗜睡，请立即就医。',
            'resources': emergency_res,
            'action_hint': '建议立即联系儿科医生或紧急求助',
        })
        need_urgent = True

    last_feed = today_records[0] if today_records else None
    if last_feed and (now - last_feed.feed_time).total_seconds() > 4 * 3600:
        hours_since = round((now - last_feed.feed_time).total_seconds() / 3600, 1)
        alerts.append({
            'level': 'info',
            'category': 'feeding_interval',
            'title': '喂养节奏提醒',
            'content': f'距离上次喂养已过去{hours_since}小时。对于新生儿，建议每2-3小时喂养一次。如果宝宝还在安睡，可以轻柔唤醒尝试喂养；如果是夜间，宝宝睡眠质量好也可以适当延长间隔。',
            'action_hint': '观察宝宝是否有饥饿信号（咂嘴、寻乳、哭闹等）',
        })

    recent_care = BreastCareRecord.query.filter(
        BreastCareRecord.user_id == user_id,
        BreastCareRecord.record_date >= today - timedelta(days=3),
    ).order_by(BreastCareRecord.record_date.desc()).all()

    severe_care = [c for c in recent_care if c.severity >= 4]
    if severe_care:
        emergency_res = _get_emergency_resources(3)
        symptoms = '、'.join([
            f'{BREAST_CARE_TYPE_LABELS.get(c.care_type, c.care_type)}（{SEVERITY_LABELS.get(c.severity, "")}）'
            for c in severe_care[:3]
        ])
        alerts.append({
            'level': 'urgent',
            'category': 'severe_breast_pain',
            'title': '⚠️ 严重：乳房严重不适警告',
            'content': f'您近期记录了严重的乳房问题：{symptoms}。严重的乳房疼痛、堵奶或乳腺炎症状需要及时处理，否则可能影响母乳喂养和您的身体健康。',
            'resources': emergency_res,
            'action_hint': '建议立即联系医生或母乳顾问，必要时前往医院就诊',
        })
        need_urgent = True

    blocked_count = sum(1 for c in recent_care if c.care_type in ['blocked_duct', 'engorgement'])
    if blocked_count >= 2:
        alerts.append({
            'level': 'warn',
            'category': 'blocked_duct_risk',
            'title': '堵奶风险提示',
            'content': f'近3天您记录了{blocked_count}次乳房胀痛或堵奶情况。频繁堵奶可能导致乳腺炎。建议：1) 确保正确的含乳姿势；2) 频繁有效排空乳房；3) 喂奶前温热敷、喂奶后冷敷；4) 多喝水、充分休息。',
            'action_hint': '如持续超过24小时未缓解或伴随发烧，请立即就医',
        })

    milk_trend = week_stats['daily_stats'][-3:] if len(week_stats['daily_stats']) >= 3 else week_stats['daily_stats']
    milk_values = [d['total_milk_ml'] for d in milk_trend if d['total_milk_ml'] > 0]
    if len(milk_values) >= 3:
        avg_first = sum(milk_values[:-1]) / (len(milk_values) - 1)
        latest = milk_values[-1]
        if avg_first > 0 and latest < avg_first * 0.5:
            emergency_res = _get_emergency_resources(2)
            drop_pct = round((1 - latest / avg_first) * 100)
            alerts.append({
                'level': 'urgent',
                'category': 'sudden_milk_drop',
                'title': '⚠️ 奶量骤降警告',
                'content': f'检测到您的吸奶量较前几日下降约{drop_pct}%。突然的奶量骤降需要关注：可能与压力、睡眠不足、水分摄入不足、堵奶或激素变化有关。请评估近期状态，如无明确原因且持续下降，建议咨询母乳顾问。',
                'resources': emergency_res,
                'action_hint': '建议增加亲喂/吸奶频率，保持充分休息和水分摄入',
            })
            need_urgent = True

    emotion_records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= today - timedelta(days=3),
    ).order_by(EmotionRecord.record_date.desc()).all()

    if emotion_records:
        avg_sleep = sum(r.sleep_hours for r in emotion_records if r.sleep_hours > 0) / len(
            [r for r in emotion_records if r.sleep_hours > 0]
        ) if any(r.sleep_hours > 0 for r in emotion_records) else 0
        avg_emotion = sum(r.emotion_score for r in emotion_records) / len(emotion_records)

        if avg_sleep > 0 and avg_sleep < 5:
            alerts.append({
                'level': 'warn',
                'category': 'sleep_deprivation',
                'title': '睡眠不足影响泌乳',
                'content': f'您近{len(emotion_records)}天平均睡眠仅{round(avg_sleep, 1)}小时。睡眠不足会显著影响泌乳素分泌，导致奶量下降。请尽可能利用宝宝睡眠时间同步休息，每天至少争取5-6小时的累计睡眠。',
                'action_hint': '请家人协助分担夜间育儿任务，哪怕每天多睡1小时也会有帮助',
            })

        if avg_emotion <= 3 and len(emotion_records) >= 2:
            alerts.append({
                'level': 'warn',
                'category': 'stress_affecting_lactation',
                'title': '情绪压力可能影响泌乳',
                'content': f'您近{len(emotion_records)}天平均情绪评分为{round(avg_emotion, 1)}分，情绪持续偏低。压力和焦虑会抑制催产素分泌，影响奶阵和泌乳量。请记得关爱自己，寻求支持，情绪健康对母乳喂养同样重要。',
                'action_hint': '可以尝试深呼吸、冥想，或向信任的人倾诉',
            })

    baby_schedules = BabySchedule.query.filter(
        BabySchedule.user_id == user_id,
        BabySchedule.record_date >= today - timedelta(days=3),
    ).order_by(BabySchedule.record_date.desc()).all()

    if baby_schedules:
        avg_baby_feed = sum(s.feed_count for s in baby_schedules) / len(baby_schedules)
        avg_baby_sleep = sum(s.sleep_total_hours for s in baby_schedules) / len(baby_schedules)
        avg_crying = sum(s.crying_duration for s in baby_schedules) / len(baby_schedules)

        if avg_crying > 120:
            alerts.append({
                'level': 'info',
                'category': 'baby_fussy',
                'title': '宝宝哭闹较多提示',
                'content': f'近{len(baby_schedules)}天宝宝日均哭闹约{round(avg_crying)}分钟。频繁哭闹可能与喂养不足、肠绞痛或身体不适有关。如果宝宝哭闹难以安抚，且伴随喂养次数减少、尿量减少，建议咨询儿科医生。',
                'action_hint': '可以尝试不同的安抚方式：抱哄、白噪音、温柔按摩腹部等',
            })

        if avg_baby_feed > 0 and avg_baby_feed < 6:
            alerts.append({
                'level': 'warn',
                'category': 'baby_low_feed',
                'title': '宝宝喂养次数偏低',
                'content': f'近{len(baby_schedules)}天宝宝日均喂养{round(avg_baby_feed, 1)}次。新生儿通常建议每天8-12次喂养。如果是母乳喂养，建议按需喂养，确保宝宝获得足够营养。',
                'action_hint': '可咨询儿科医生确认宝宝生长发育是否正常',
            })

    if not alerts:
        alerts.append({
            'level': 'info',
            'category': 'normal',
            'title': '今日状态良好',
            'content': '目前未检测到需要特别关注的喂养或泌乳问题。请继续保持良好的喂养节奏，记得多喝水、充分休息，您和宝宝都很棒！',
            'action_hint': '坚持记录有助于发现规律，更好地照顾自己和宝宝',
        })

    return alerts, need_urgent


@feeding_bp.route('/records', methods=['GET'])
def get_records():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 7, type=int)
    feed_type = request.args.get('feed_type')

    start_date = date.today() - timedelta(days=days - 1)
    query = FeedingRecord.query.filter(
        FeedingRecord.user_id == user_id,
        FeedingRecord.feed_time >= datetime.combine(start_date, datetime.min.time()),
    )
    if feed_type:
        query = query.filter_by(feed_type=feed_type)

    records = query.order_by(FeedingRecord.feed_time.desc()).all()
    result = []
    for r in records:
        result.append({
            'id': r.id,
            'feed_type': r.feed_type,
            'feed_type_label': FEED_TYPE_LABELS.get(r.feed_type, r.feed_type),
            'feed_time': r.feed_time.strftime('%Y-%m-%d %H:%M:%S'),
            'duration_minutes': r.duration_minutes,
            'breast_side': r.breast_side,
            'milk_amount_ml': r.milk_amount_ml,
            'baby_acceptance': r.baby_acceptance,
            'note': r.note,
            'care_count': len(r.care_records),
        })
    return jsonify({'success': True, 'data': result})


@feeding_bp.route('/records/today', methods=['GET'])
def get_today_records():
    user_id = request.args.get('user_id', 1, type=int)
    today = date.today()
    records = FeedingRecord.query.filter(
        FeedingRecord.user_id == user_id,
        FeedingRecord.feed_time >= datetime.combine(today, datetime.min.time()),
        FeedingRecord.feed_time <= datetime.combine(today, datetime.max.time()),
    ).order_by(FeedingRecord.feed_time.asc()).all()

    result = []
    total_milk = 0
    total_duration = 0
    for r in records:
        total_milk += r.milk_amount_ml or 0
        total_duration += r.duration_minutes or 0
        result.append({
            'id': r.id,
            'feed_type': r.feed_type,
            'feed_type_label': FEED_TYPE_LABELS.get(r.feed_type, r.feed_type),
            'feed_time': r.feed_time.strftime('%Y-%m-%d %H:%M:%S'),
            'time_label': r.feed_time.strftime('%H:%M'),
            'duration_minutes': r.duration_minutes,
            'breast_side': r.breast_side,
            'milk_amount_ml': r.milk_amount_ml,
            'baby_acceptance': r.baby_acceptance,
            'note': r.note,
        })

    return jsonify({
        'success': True,
        'data': {
            'records': result,
            'summary': {
                'count': len(result),
                'total_milk_ml': round(total_milk, 1),
                'total_duration_min': total_duration,
            }
        }
    })


@feeding_bp.route('/records', methods=['POST'])
def add_record():
    data = request.get_json() or {}
    user_id = data.get('user_id', 1)
    feed_type = data.get('feed_type')
    if not feed_type or feed_type not in FEED_TYPE_LABELS:
        return jsonify({'success': False, 'message': '喂养类型无效'}), 400

    record = FeedingRecord(
        user_id=user_id,
        feed_type=feed_type,
        feed_time=_parse_datetime(data.get('feed_time')),
        duration_minutes=data.get('duration_minutes', 0) or 0,
        breast_side=data.get('breast_side', ''),
        milk_amount_ml=data.get('milk_amount_ml', 0) or 0,
        baby_acceptance=data.get('baby_acceptance', 3) or 3,
        note=data.get('note', ''),
    )
    db.session.add(record)
    db.session.commit()

    if data.get('care_records'):
        for care_data in data['care_records']:
            care = BreastCareRecord(
                user_id=user_id,
                feeding_record_id=record.id,
                record_date=record.feed_time.date(),
                care_type=care_data.get('care_type', 'other'),
                severity=care_data.get('severity', 3),
                breast_side=care_data.get('breast_side', 'both'),
                description=care_data.get('description', ''),
                duration_hours=care_data.get('duration_hours', 0),
                action_taken=care_data.get('action_taken', ''),
                consulted_doctor=bool(care_data.get('consulted_doctor', False)),
            )
            db.session.add(care)
        db.session.commit()

    return jsonify({'success': True, 'data': {'id': record.id}})


@feeding_bp.route('/records/<int:record_id>', methods=['PUT'])
def update_record(record_id):
    record = FeedingRecord.query.get(record_id)
    if not record:
        return jsonify({'success': False, 'message': '喂养记录不存在'}), 404

    data = request.get_json() or {}
    for field in ['feed_type', 'duration_minutes', 'breast_side', 'milk_amount_ml', 'baby_acceptance', 'note']:
        if field in data:
            setattr(record, field, data[field])
    if 'feed_time' in data:
        record.feed_time = _parse_datetime(data['feed_time'])
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': record.id}})


@feeding_bp.route('/records/<int:record_id>', methods=['DELETE'])
def delete_record(record_id):
    record = FeedingRecord.query.get(record_id)
    if not record:
        return jsonify({'success': False, 'message': '喂养记录不存在'}), 404
    db.session.delete(record)
    db.session.commit()
    return jsonify({'success': True})


@feeding_bp.route('/care-records', methods=['GET'])
def get_care_records():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)

    start_date = date.today() - timedelta(days=days - 1)
    records = BreastCareRecord.query.filter(
        BreastCareRecord.user_id == user_id,
        BreastCareRecord.record_date >= start_date,
    ).order_by(BreastCareRecord.record_date.desc()).all()

    result = []
    for r in records:
        result.append({
            'id': r.id,
            'feeding_record_id': r.feeding_record_id,
            'record_date': r.record_date.isoformat(),
            'care_type': r.care_type,
            'care_type_label': BREAST_CARE_TYPE_LABELS.get(r.care_type, r.care_type),
            'severity': r.severity,
            'severity_label': SEVERITY_LABELS.get(r.severity, ''),
            'breast_side': r.breast_side,
            'description': r.description,
            'duration_hours': r.duration_hours,
            'action_taken': r.action_taken,
            'consulted_doctor': r.consulted_doctor,
        })
    return jsonify({'success': True, 'data': result})


@feeding_bp.route('/care-records', methods=['POST'])
def add_care_record():
    data = request.get_json() or {}
    user_id = data.get('user_id', 1)
    care_type = data.get('care_type')
    if not care_type:
        return jsonify({'success': False, 'message': '护理类型不能为空'}), 400

    record = BreastCareRecord(
        user_id=user_id,
        feeding_record_id=data.get('feeding_record_id'),
        record_date=_parse_date(data.get('record_date')) or date.today(),
        care_type=care_type,
        severity=data.get('severity', 3) or 3,
        breast_side=data.get('breast_side', 'both'),
        description=data.get('description', ''),
        duration_hours=data.get('duration_hours', 0) or 0,
        action_taken=data.get('action_taken', ''),
        consulted_doctor=bool(data.get('consulted_doctor', False)),
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': record.id}})


@feeding_bp.route('/care-records/<int:record_id>', methods=['PUT'])
def update_care_record(record_id):
    record = BreastCareRecord.query.get(record_id)
    if not record:
        return jsonify({'success': False, 'message': '护理记录不存在'}), 404

    data = request.get_json() or {}
    for field in ['care_type', 'severity', 'breast_side', 'description', 'duration_hours', 'action_taken']:
        if field in data:
            setattr(record, field, data[field])
    if 'consulted_doctor' in data:
        record.consulted_doctor = bool(data['consulted_doctor'])
    if 'record_date' in data:
        d = _parse_date(data['record_date'])
        if d:
            record.record_date = d
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': record.id}})


@feeding_bp.route('/care-records/<int:record_id>', methods=['DELETE'])
def delete_care_record(record_id):
    record = BreastCareRecord.query.get(record_id)
    if not record:
        return jsonify({'success': False, 'message': '护理记录不存在'}), 404
    db.session.delete(record)
    db.session.commit()
    return jsonify({'success': True})


@feeding_bp.route('/goals', methods=['GET'])
def get_goals():
    user_id = request.args.get('user_id', 1, type=int)
    status = request.args.get('status')

    query = LactationGoal.query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status)

    goals = query.order_by(LactationGoal.created_at.desc()).all()
    result = []
    for g in goals:
        result.append({
            'id': g.id,
            'goal_type': g.goal_type,
            'goal_type_label': GOAL_TYPE_LABELS.get(g.goal_type, g.goal_type),
            'target_value': g.target_value,
            'current_value': g.current_value,
            'unit': g.unit,
            'start_date': g.start_date.isoformat() if g.start_date else None,
            'target_date': g.target_date.isoformat() if g.target_date else None,
            'status': g.status,
            'note': g.note,
            'completion_rate': round(g.current_value / g.target_value * 100, 1) if g.target_value > 0 else 0,
        })
    return jsonify({'success': True, 'data': result})


@feeding_bp.route('/goals', methods=['POST'])
def add_goal():
    data = request.get_json() or {}
    user_id = data.get('user_id', 1)
    goal_type = data.get('goal_type')
    if not goal_type:
        return jsonify({'success': False, 'message': '目标类型不能为空'}), 400

    goal = LactationGoal(
        user_id=user_id,
        goal_type=goal_type,
        target_value=data.get('target_value', 0) or 0,
        current_value=data.get('current_value', 0) or 0,
        unit=data.get('unit', ''),
        start_date=_parse_date(data.get('start_date')) or date.today(),
        target_date=_parse_date(data.get('target_date')),
        status=data.get('status', 'active'),
        note=data.get('note', ''),
    )
    db.session.add(goal)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': goal.id}})


@feeding_bp.route('/goals/<int:goal_id>', methods=['PUT'])
def update_goal(goal_id):
    goal = LactationGoal.query.get(goal_id)
    if not goal:
        return jsonify({'success': False, 'message': '目标不存在'}), 404

    data = request.get_json() or {}
    for field in ['goal_type', 'target_value', 'current_value', 'unit', 'status', 'note']:
        if field in data:
            setattr(goal, field, data[field])
    for f in ['start_date', 'target_date']:
        if f in data:
            d = _parse_date(data[f])
            if d:
                setattr(goal, f, d)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': goal.id}})


@feeding_bp.route('/goals/<int:goal_id>', methods=['DELETE'])
def delete_goal(goal_id):
    goal = LactationGoal.query.get(goal_id)
    if not goal:
        return jsonify({'success': False, 'message': '目标不存在'}), 404
    db.session.delete(goal)
    db.session.commit()
    return jsonify({'success': True})


@feeding_bp.route('/advices', methods=['GET'])
def get_advices():
    user_id = request.args.get('user_id', 1, type=int)
    is_completed = request.args.get('is_completed', type=int)

    query = LactationAdvice.query.filter_by(user_id=user_id)
    if is_completed is not None:
        query = query.filter_by(is_completed=bool(is_completed))

    advices = query.order_by(LactationAdvice.advice_date.desc()).all()
    result = []
    for a in advices:
        result.append({
            'id': a.id,
            'advisor': a.advisor,
            'advisor_type': a.advisor_type,
            'advisor_type_label': ADVISOR_TYPE_LABELS.get(a.advisor_type, a.advisor_type),
            'content': a.content,
            'advice_date': a.advice_date.isoformat() if a.advice_date else None,
            'is_completed': a.is_completed,
            'follow_up_date': a.follow_up_date.isoformat() if a.follow_up_date else None,
            'note': a.note,
        })
    return jsonify({'success': True, 'data': result})


@feeding_bp.route('/advices', methods=['POST'])
def add_advice():
    data = request.get_json() or {}
    user_id = data.get('user_id', 1)
    advisor = data.get('advisor', '').strip()
    content = data.get('content', '').strip()
    if not advisor or not content:
        return jsonify({'success': False, 'message': '顾问姓名和建议内容不能为空'}), 400

    advice = LactationAdvice(
        user_id=user_id,
        advisor=advisor,
        advisor_type=data.get('advisor_type', 'doctor'),
        content=content,
        advice_date=_parse_date(data.get('advice_date')) or date.today(),
        is_completed=bool(data.get('is_completed', False)),
        follow_up_date=_parse_date(data.get('follow_up_date')),
        note=data.get('note', ''),
    )
    db.session.add(advice)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': advice.id}})


@feeding_bp.route('/advices/<int:advice_id>', methods=['PUT'])
def update_advice(advice_id):
    advice = LactationAdvice.query.get(advice_id)
    if not advice:
        return jsonify({'success': False, 'message': '建议记录不存在'}), 404

    data = request.get_json() or {}
    for field in ['advisor', 'advisor_type', 'content', 'note']:
        if field in data:
            setattr(advice, field, data[field])
    if 'is_completed' in data:
        advice.is_completed = bool(data['is_completed'])
    for f in ['advice_date', 'follow_up_date']:
        if f in data:
            d = _parse_date(data[f])
            if d:
                setattr(advice, f, d)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': advice.id}})


@feeding_bp.route('/advices/<int:advice_id>', methods=['DELETE'])
def delete_advice(advice_id):
    advice = LactationAdvice.query.get(advice_id)
    if not advice:
        return jsonify({'success': False, 'message': '建议记录不存在'}), 404
    db.session.delete(advice)
    db.session.commit()
    return jsonify({'success': True})


@feeding_bp.route('/alerts', methods=['GET'])
def get_alerts():
    user_id = request.args.get('user_id', 1, type=int)
    alerts, need_urgent = generate_feeding_alerts(user_id)

    stored_alerts = FeedingAlert.query.filter_by(
        user_id=user_id, is_acknowledged=False
    ).order_by(FeedingAlert.created_at.desc()).all()

    stored = []
    for a in stored_alerts:
        stored.append({
            'id': a.id,
            'alert_type': a.alert_type,
            'level': a.level,
            'title': a.title,
            'content': a.content,
            'alert_date': a.alert_date.isoformat(),
            'is_acknowledged': a.is_acknowledged,
        })

    return jsonify({
        'success': True,
        'data': {
            'alerts': alerts,
            'stored_alerts': stored,
            'need_urgent': need_urgent,
        }
    })


@feeding_bp.route('/alert/acknowledge/<int:alert_id>', methods=['POST'])
def acknowledge_alert(alert_id):
    alert = FeedingAlert.query.get(alert_id)
    if not alert:
        return jsonify({'success': False, 'message': '提醒不存在'}), 404
    alert.is_acknowledged = True
    db.session.commit()
    return jsonify({'success': True})


@feeding_bp.route('/stats', methods=['GET'])
def get_feeding_stats():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)

    today = date.today()
    start_date = today - timedelta(days=days - 1)

    week_stats = _calculate_feeding_stats(user_id, days=min(days, 7))
    full_stats = _calculate_feeding_stats(user_id, days=days)

    records = FeedingRecord.query.filter(
        FeedingRecord.user_id == user_id,
        FeedingRecord.feed_time >= datetime.combine(start_date, datetime.min.time()),
        FeedingRecord.feed_time <= datetime.combine(today, datetime.max.time()),
    ).all()

    daily_count = defaultdict(int)
    daily_milk = defaultdict(float)
    daily_duration = defaultdict(int)
    type_counter = Counter()
    side_counter = Counter()

    for r in records:
        d = r.feed_time.date().isoformat()
        daily_count[d] += 1
        if r.milk_amount_ml:
            daily_milk[d] += r.milk_amount_ml
        if r.duration_minutes:
            daily_duration[d] += r.duration_minutes
        type_counter[r.feed_type] += 1
        if r.breast_side:
            side_counter[r.breast_side] += 1

    daily_trend = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        d_str = d.isoformat()
        daily_trend.append({
            'date': d_str,
            'feed_count': daily_count.get(d_str, 0),
            'total_milk_ml': round(daily_milk.get(d_str, 0), 1),
            'total_duration_min': daily_duration.get(d_str, 0),
        })

    type_distribution = []
    total_type = sum(type_counter.values())
    for t, c in type_counter.most_common():
        type_distribution.append({
            'type': t,
            'type_label': FEED_TYPE_LABELS.get(t, t),
            'count': c,
            'percentage': round(c / total_type * 100, 1) if total_type > 0 else 0,
        })

    side_distribution = []
    total_side = sum(side_counter.values())
    for s, c in side_counter.most_common():
        label = '左侧' if s == 'left' else ('右侧' if s == 'right' else ('交替' if s == 'both' else s))
        side_distribution.append({
            'side': s,
            'side_label': label,
            'count': c,
            'percentage': round(c / total_side * 100, 1) if total_side > 0 else 0,
        })

    care_records = BreastCareRecord.query.filter(
        BreastCareRecord.user_id == user_id,
        BreastCareRecord.record_date >= start_date,
        BreastCareRecord.record_date <= today,
    ).all()

    care_type_counter = Counter()
    care_severity_counter = Counter()
    for c in care_records:
        care_type_counter[c.care_type] += 1
        care_severity_counter[c.severity] += 1

    care_type_distribution = []
    total_care = sum(care_type_counter.values())
    for t, c in care_type_counter.most_common():
        care_type_distribution.append({
            'type': t,
            'type_label': BREAST_CARE_TYPE_LABELS.get(t, t),
            'count': c,
            'percentage': round(c / total_care * 100, 1) if total_care > 0 else 0,
        })

    care_severity_distribution = []
    for sev in sorted(care_severity_counter.keys()):
        care_severity_distribution.append({
            'severity': sev,
            'severity_label': SEVERITY_LABELS.get(sev, ''),
            'count': care_severity_counter[sev],
        })

    goals = LactationGoal.query.filter_by(user_id=user_id, status='active').all()
    goal_achievement = []
    for g in goals:
        rate = round(g.current_value / g.target_value * 100, 1) if g.target_value > 0 else 0
        goal_achievement.append({
            'id': g.id,
            'goal_type': g.goal_type,
            'goal_type_label': GOAL_TYPE_LABELS.get(g.goal_type, g.goal_type),
            'target_value': g.target_value,
            'current_value': g.current_value,
            'unit': g.unit,
            'completion_rate': rate,
            'achieved': rate >= 100,
        })

    total_goal_count = len(goal_achievement)
    achieved_goal_count = sum(1 for g in goal_achievement if g['achieved'])
    overall_goal_rate = round(achieved_goal_count / total_goal_count * 100, 1) if total_goal_count > 0 else 0

    milk_curve = []
    for item in daily_trend:
        milk_curve.append({
            'date': item['date'],
            'milk_ml': item['total_milk_ml'],
            'feed_count': item['feed_count'],
        })

    avg_week_count = week_stats['avg_daily_count']
    avg_month_count = full_stats['avg_daily_count']
    total_milk_month = full_stats['total_milk_ml']

    return jsonify({
        'success': True,
        'data': {
            'period_days': days,
            'overview': {
                'total_feed_count': full_stats['total_records'],
                'avg_weekly_count': avg_week_count,
                'avg_daily_count': avg_month_count,
                'total_milk_ml': total_milk_month,
                'avg_baby_acceptance': full_stats['avg_baby_acceptance'],
                'care_record_count': len(care_records),
                'severe_care_count': sum(1 for c in care_records if c.severity >= 4),
                'active_goals_count': total_goal_count,
                'achieved_goals_count': achieved_goal_count,
                'overall_goal_rate': overall_goal_rate,
            },
            'daily_trend': daily_trend,
            'milk_curve': milk_curve,
            'type_distribution': type_distribution,
            'side_distribution': side_distribution,
            'breast_care_stats': {
                'total': len(care_records),
                'severe_count': sum(1 for c in care_records if c.severity >= 4),
                'type_distribution': care_type_distribution,
                'severity_distribution': care_severity_distribution,
            },
            'goal_achievement': goal_achievement,
        }
    })


@feeding_bp.route('/today', methods=['GET'])
def get_today_overview():
    user_id = request.args.get('user_id', 1, type=int)

    today_res = get_today_records()
    import json as _json
    today_data = _json.loads(today_res.get_data(as_text=True))['data']

    alerts, need_urgent = generate_feeding_alerts(user_id)

    today = date.today()
    goals = LactationGoal.query.filter_by(user_id=user_id, status='active').all()
    goal_status = []
    for g in goals:
        if g.goal_type == 'daily_feed_count':
            g.current_value = today_data['summary']['count']
        elif g.goal_type == 'daily_milk_amount':
            g.current_value = today_data['summary']['total_milk_ml']
        goal_status.append({
            'id': g.id,
            'goal_type': g.goal_type,
            'goal_type_label': GOAL_TYPE_LABELS.get(g.goal_type, g.goal_type),
            'target_value': g.target_value,
            'current_value': g.current_value,
            'unit': g.unit,
            'completion_rate': round(g.current_value / g.target_value * 100, 1) if g.target_value > 0 else 0,
        })

    recent_care = BreastCareRecord.query.filter(
        BreastCareRecord.user_id == user_id,
        BreastCareRecord.record_date >= today - timedelta(days=3),
    ).order_by(BreastCareRecord.record_date.desc()).limit(5).all()

    recent_care_list = []
    for c in recent_care:
        recent_care_list.append({
            'id': c.id,
            'care_type': c.care_type,
            'care_type_label': BREAST_CARE_TYPE_LABELS.get(c.care_type, c.care_type),
            'severity': c.severity,
            'severity_label': SEVERITY_LABELS.get(c.severity, ''),
            'record_date': c.record_date.isoformat(),
        })

    return jsonify({
        'success': True,
        'data': {
            'today': today_data,
            'alerts': alerts,
            'need_urgent': need_urgent,
            'goals_today': goal_status,
            'recent_care': recent_care_list,
            'date': today.isoformat(),
        }
    })
