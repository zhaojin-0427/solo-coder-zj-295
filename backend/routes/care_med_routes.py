from flask import Blueprint, request, jsonify
from datetime import date, timedelta, datetime
from collections import defaultdict, Counter
from models import db, PostpartumVisit, Medication, MedicationLog, AdverseReaction, EmotionRecord, CounselingResource

care_med_bp = Blueprint('care_med', __name__)

VISIT_STATUS_LABELS = {
    'pending': '待就诊',
    'completed': '已完成',
    'cancelled': '已取消',
    'overdue': '已逾期',
}

MED_LOG_STATUS_LABELS = {
    'pending': '待服用',
    'taken': '已服用',
    'missed': '已漏服',
    'skipped': '已跳过',
}

SEVERITY_LABELS = {
    1: '轻微',
    2: '较轻',
    3: '一般',
    4: '较重',
    5: '严重',
}


def _parse_date(s):
    try:
        return datetime.strptime(s, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None


def _consecutive_missed_days(user_id, days=7):
    today = date.today()
    start = today - timedelta(days=days - 1)
    missed_days = 0
    for i in range(days):
        d = start + timedelta(days=i)
        if d > today:
            break
        logs = MedicationLog.query.filter_by(
            user_id=user_id, log_date=d, status='missed'
        ).all()
        if logs:
            missed_days += 1
        else:
            missed_days = 0
    return missed_days


def _recent_emotion_state(user_id, days=3):
    today = date.today()
    start = today - timedelta(days=days - 1)
    records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= start,
        EmotionRecord.record_date <= today
    ).order_by(EmotionRecord.record_date.desc()).all()
    if not records:
        return None
    avg_emotion = sum(r.emotion_score for r in records) / len(records)
    avg_sleep = sum(r.sleep_hours for r in records if r.sleep_hours > 0) / len([r for r in records if r.sleep_hours > 0]) if any(r.sleep_hours > 0 for r in records) else 0
    avg_sleep_quality = sum(r.sleep_quality for r in records) / len(records)
    return {
        'avg_emotion': round(avg_emotion, 1),
        'avg_sleep': round(avg_sleep, 1),
        'avg_sleep_quality': round(avg_sleep_quality, 1),
        'record_count': len(records),
    }


def _count_overdue_visits(user_id):
    today = date.today()
    return PostpartumVisit.query.filter(
        PostpartumVisit.user_id == user_id,
        PostpartumVisit.visit_date < today,
        PostpartumVisit.status == 'pending'
    ).count()


def _count_severe_reactions(user_id, days=7):
    today = date.today()
    start = today - timedelta(days=days - 1)
    return AdverseReaction.query.filter(
        AdverseReaction.user_id == user_id,
        AdverseReaction.reaction_date >= start,
        AdverseReaction.severity >= 4
    ).count()


def _count_upcoming_visits(user_id, days=3):
    today = date.today()
    end = today + timedelta(days=days)
    return PostpartumVisit.query.filter(
        PostpartumVisit.user_id == user_id,
        PostpartumVisit.visit_date >= today,
        PostpartumVisit.visit_date <= end,
        PostpartumVisit.status == 'pending'
    ).count()


def generate_alerts(user_id):
    alerts = []
    today = date.today()

    emotion_state = _recent_emotion_state(user_id)
    consecutive_missed = _consecutive_missed_days(user_id)
    overdue_count = _count_overdue_visits(user_id)
    severe_count = _count_severe_reactions(user_id)
    upcoming_count = _count_upcoming_visits(user_id)

    need_urgent = False

    emergency_resources = CounselingResource.query.filter_by(is_emergency=True).all()

    if overdue_count > 0:
        overdue_visits = PostpartumVisit.query.filter(
            PostpartumVisit.user_id == user_id,
            PostpartumVisit.visit_date < today,
            PostpartumVisit.status == 'pending'
        ).order_by(PostpartumVisit.visit_date.asc()).all()
        visit_names = '、'.join([f'{v.visit_type}（{v.visit_date.strftime("%m月%d日")}）' for v in overdue_visits[:3]])
        alerts.append({
            'level': 'urgent',
            'category': 'visit_overdue',
            'title': '复诊逾期提醒',
            'content': f'您有{overdue_count}项产后复诊已逾期：{visit_names}。请尽快联系医院补约复诊时间，产后定期检查对您的身体恢复非常重要。',
            'resources': [{'title': r.title, 'contact': r.contact} for r in emergency_resources[:2]] if overdue_count > 1 else None,
            'action_hint': '建议尽快联系主治医生或当地妇幼保健院',
        })
        need_urgent = True

    if consecutive_missed >= 3:
        alerts.append({
            'level': 'urgent',
            'category': 'consecutive_missed',
            'title': '连续漏服警告',
            'content': f'检测到您已连续{consecutive_missed}天存在漏服药物情况。持续规律用药对产后恢复至关重要，如漏服是因不良反应或忘记，请及时联系医生调整用药方案或设置更明显的服药提醒。',
            'resources': [{'title': r.title, 'contact': r.contact} for r in emergency_resources[:2]],
            'action_hint': '如身体不适请立即咨询医生',
        })
        need_urgent = True

    if severe_count > 0:
        severe_reactions = AdverseReaction.query.filter(
            AdverseReaction.user_id == user_id,
            AdverseReaction.severity >= 4
        ).order_by(AdverseReaction.reaction_date.desc()).limit(3).all()
        symptoms = '、'.join([f'{r.symptom}（{SEVERITY_LABELS.get(r.severity, "")}）' for r in severe_reactions])
        alerts.append({
            'level': 'urgent',
            'category': 'severe_reaction',
            'title': '严重不适反应警告',
            'content': f'您近期记录了{severe_count}项较严重的身体不适反应：{symptoms}。强烈建议您立即联系主治医生，详细描述症状，切勿自行停药或调整剂量。',
            'resources': [{'title': r.title, 'contact': r.contact} for r in emergency_resources[:2]],
            'action_hint': '如症状严重请立即就医或拨打急救电话',
        })
        need_urgent = True

    if emotion_state and emotion_state['avg_emotion'] <= 3 and emotion_state['record_count'] >= 2:
        alerts.append({
            'level': 'warn',
            'category': 'low_emotion',
            'title': '情绪状态偏低',
            'content': f'您近{emotion_state["record_count"]}天平均情绪评分为{emotion_state["avg_emotion"]}分，情绪持续偏低。产后情绪波动是正常的，但如果这种状态持续，建议您和医生谈谈，或者拨打心理援助热线倾诉。情绪健康和身体健康同样重要。',
            'resources': [{'title': r.title, 'contact': r.contact} for r in emergency_resources[:2]],
            'action_hint': '不必独自承受，寻求帮助是勇敢的表现',
        })

    if emotion_state and emotion_state['avg_sleep'] > 0 and emotion_state['avg_sleep'] < 4 and emotion_state['record_count'] >= 2:
        alerts.append({
            'level': 'warn',
            'category': 'severe_sleep',
            'title': '睡眠严重不足',
            'content': f'您近{emotion_state["record_count"]}天平均睡眠仅{emotion_state["avg_sleep"]}小时。长期睡眠不足会影响身体恢复和情绪状态，也可能影响服药依从性。建议与家人协商分担夜间育儿任务，尽可能补充睡眠。',
            'action_hint': '哪怕每天多睡半小时也会有帮助',
        })

    if upcoming_count > 0:
        upcoming = PostpartumVisit.query.filter(
            PostpartumVisit.user_id == user_id,
            PostpartumVisit.visit_date >= today,
            PostpartumVisit.status == 'pending'
        ).order_by(PostpartumVisit.visit_date.asc()).limit(3).all()
        for v in upcoming:
            days_left = (v.visit_date - today).days
            if days_left == 0:
                alerts.append({
                    'level': 'warn',
                    'category': 'visit_today',
                    'title': '今日复诊提醒',
                    'content': f'今天是您的{v.visit_type}日期！请记得携带产检手册、既往检查报告，按时前往{v.hospital or "医院"}{v.department and f"{v.department}" or ""}就诊。{v.check_items and f"本次需检查：{v.check_items[:50]}" or ""}',
                    'action_hint': '建议提前30分钟到达医院',
                })
            elif days_left == 1:
                alerts.append({
                    'level': 'info',
                    'category': 'visit_tomorrow',
                    'title': '明日复诊提醒',
                    'content': f'明天（{v.visit_date.strftime("%m月%d日")}）是您的{v.visit_type}日期，请提前做好准备：确认就诊时间、准备好所需资料，{v.doctor_name and f"主治医生：{v.doctor_name}" or ""}。',
                    'action_hint': '可提前设置出行闹钟',
                })
            elif days_left <= 3:
                alerts.append({
                    'level': 'info',
                    'category': 'visit_soon',
                    'title': '复诊临近提醒',
                    'content': f'距离您的{v.visit_type}还有{days_left}天（{v.visit_date.strftime("%m月%d日")}），就诊医院：{v.hospital or "待确认"}。建议提前确认预约信息是否正确。',
                    'action_hint': '如有疑问可提前致电医院确认',
                })

    active_meds = Medication.query.filter_by(user_id=user_id, is_active=True).all()
    if active_meds:
        for med in active_meds:
            start_ok = med.start_date is None or med.start_date <= today
            end_ok = med.end_date is None or med.end_date >= today
            if not (start_ok and end_ok):
                continue
            today_logs = MedicationLog.query.filter_by(
                user_id=user_id, medication_id=med.id, log_date=today
            ).all()
            expected = med.frequency_per_day or 1
            if len(today_logs) < expected:
                pending_count = sum(1 for l in today_logs if l.status == 'pending')
                taken_count = sum(1 for l in today_logs if l.status == 'taken')
                if taken_count < expected:
                    alerts.append({
                        'level': 'info',
                        'category': 'medication_pending',
                        'title': f'{med.name}待服用',
                        'content': f'今日需服用{med.name} {expected}次，已服用{taken_count}次。{med.dosage and f"剂量：{med.dosage}" or ""} {med.meal_relation and f"服用要求：{med.meal_relation}" or ""}',
                        'action_hint': f'建议按时服用，{med.notes and f"注意：{med.notes[:30]}" or ""}',
                        'medication_id': med.id,
                    })
                    break

    if not alerts:
        alerts.append({
            'level': 'info',
            'category': 'normal',
            'title': '今日状态良好',
            'content': '目前未检测到需要特别关注的情况，请继续保持规律作息和按时复诊服药。记得多喝水、适当休息，您做得很棒！',
            'action_hint': '每天记录身体状态，系统会持续为您的健康保驾护航',
        })

    return alerts, need_urgent


def generate_today_todo(user_id):
    today = date.today()
    todos = []

    visits_today = PostpartumVisit.query.filter(
        PostpartumVisit.user_id == user_id,
        PostpartumVisit.visit_date == today,
        PostpartumVisit.status == 'pending'
    ).all()
    for v in visits_today:
        todos.append({
            'type': 'visit',
            'id': v.id,
            'title': v.visit_type or '产后复诊',
            'subtitle': f'{v.hospital or "医院"} {v.department or ""}',
            'time': '全天',
            'priority': 'high',
            'status': 'pending',
            'extra': {
                'doctor': v.doctor_name,
                'check_items': v.check_items,
            }
        })

    overdue_visits = PostpartumVisit.query.filter(
        PostpartumVisit.user_id == user_id,
        PostpartumVisit.visit_date < today,
        PostpartumVisit.status == 'pending'
    ).order_by(PostpartumVisit.visit_date.asc()).all()
    for v in overdue_visits:
        days_overdue = (today - v.visit_date).days
        todos.append({
            'type': 'visit',
            'id': v.id,
            'title': f'补约：{v.visit_type or "产后复诊"}',
            'subtitle': f'已逾期{days_overdue}天 · {v.hospital or "医院"}',
            'time': f'原{v.visit_date.strftime("%m月%d日")}',
            'priority': 'urgent',
            'status': 'overdue',
            'extra': {
                'doctor': v.doctor_name,
                'check_items': v.check_items,
            }
        })

    active_meds = Medication.query.filter_by(user_id=user_id, is_active=True).all()
    for med in active_meds:
        if med.start_date and med.start_date > today:
            continue
        if med.end_date and med.end_date < today:
            continue
        expected = med.frequency_per_day or 1
        specific_times = []
        if med.specific_times:
            specific_times = [t.strip() for t in med.specific_times.split(',') if t.strip()]

        for i in range(expected):
            scheduled_time = specific_times[i] if i < len(specific_times) else ''
            log = MedicationLog.query.filter_by(
                user_id=user_id,
                medication_id=med.id,
                log_date=today,
                scheduled_time=scheduled_time
            ).first()

            status = log.status if log else 'pending'
            log_id = log.id if log else None

            todos.append({
                'type': 'medication',
                'id': med.id,
                'log_id': log_id,
                'title': med.name,
                'subtitle': f'{med.dosage or ""} {med.category or ""}',
                'time': scheduled_time or f'第{i+1}次',
                'priority': 'normal' if status == 'taken' else 'high',
                'status': status,
                'extra': {
                    'category': med.category,
                    'meal_relation': med.meal_relation,
                    'notes': med.notes,
                }
            })

    todos.sort(key=lambda x: {'urgent': 0, 'high': 1, 'normal': 2, 'low': 3}.get(x['priority'], 9))
    return todos


@care_med_bp.route('/visits', methods=['GET'])
def get_visits():
    user_id = request.args.get('user_id', 1, type=int)
    status = request.args.get('status')
    days = request.args.get('days', type=int)

    query = PostpartumVisit.query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status)
    if days:
        start = date.today() - timedelta(days=days)
        query = query.filter(PostpartumVisit.visit_date >= start)

    visits = query.order_by(PostpartumVisit.visit_date.desc()).all()
    result = []
    for v in visits:
        meds = Medication.query.filter_by(visit_id=v.id).count()
        result.append({
            'id': v.id,
            'visit_date': v.visit_date.isoformat(),
            'hospital': v.hospital,
            'department': v.department,
            'doctor_name': v.doctor_name,
            'visit_type': v.visit_type,
            'check_items': v.check_items,
            'doctor_advice': v.doctor_advice,
            'status': v.status,
            'status_label': VISIT_STATUS_LABELS.get(v.status, v.status),
            'result_note': v.result_note,
            'completed_date': v.completed_date.isoformat() if v.completed_date else None,
            'medication_count': meds,
        })
    return jsonify({'success': True, 'data': result})


@care_med_bp.route('/visits', methods=['POST'])
def add_visit():
    data = request.get_json() or {}
    user_id = data.get('user_id', 1)
    visit_date = _parse_date(data.get('visit_date'))
    if not visit_date:
        return jsonify({'success': False, 'message': '就诊日期不能为空'}), 400

    visit = PostpartumVisit(
        user_id=user_id,
        visit_date=visit_date,
        hospital=data.get('hospital', ''),
        department=data.get('department', ''),
        doctor_name=data.get('doctor_name', ''),
        visit_type=data.get('visit_type', '常规复诊'),
        check_items=data.get('check_items', ''),
        doctor_advice=data.get('doctor_advice', ''),
        status=data.get('status', 'pending'),
        result_note=data.get('result_note', ''),
    )
    db.session.add(visit)
    db.session.commit()

    meds = data.get('medications', [])
    for med_data in meds:
        med = Medication(
            user_id=user_id,
            visit_id=visit.id,
            name=med_data.get('name', ''),
            category=med_data.get('category', '处方药'),
            dosage=med_data.get('dosage', ''),
            frequency_per_day=med_data.get('frequency_per_day', 1),
            specific_times=med_data.get('specific_times', ''),
            start_date=_parse_date(med_data.get('start_date')) or visit_date,
            end_date=_parse_date(med_data.get('end_date')),
            meal_relation=med_data.get('meal_relation', '无要求'),
            notes=med_data.get('notes', ''),
        )
        if med.name:
            db.session.add(med)
    if meds:
        db.session.commit()

    return jsonify({'success': True, 'data': {'id': visit.id}})


@care_med_bp.route('/visits/<int:visit_id>', methods=['PUT'])
def update_visit(visit_id):
    visit = PostpartumVisit.query.get(visit_id)
    if not visit:
        return jsonify({'success': False, 'message': '复诊记录不存在'}), 404

    data = request.get_json() or {}
    for field in ['hospital', 'department', 'doctor_name', 'visit_type', 'check_items', 'doctor_advice', 'result_note']:
        if field in data:
            setattr(visit, field, data[field])
    if 'visit_date' in data:
        d = _parse_date(data['visit_date'])
        if d:
            visit.visit_date = d
    if 'status' in data:
        visit.status = data['status']
        if data['status'] == 'completed' and not visit.completed_date:
            visit.completed_date = date.today()
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': visit.id}})


@care_med_bp.route('/visits/<int:visit_id>/complete', methods=['POST'])
def complete_visit(visit_id):
    visit = PostpartumVisit.query.get(visit_id)
    if not visit:
        return jsonify({'success': False, 'message': '复诊记录不存在'}), 404

    data = request.get_json() or {}
    visit.status = 'completed'
    visit.completed_date = date.today()
    if 'result_note' in data:
        visit.result_note = data['result_note']
    if 'doctor_advice' in data:
        visit.doctor_advice = data['doctor_advice']
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': visit.id}})


@care_med_bp.route('/visits/<int:visit_id>', methods=['DELETE'])
def delete_visit(visit_id):
    visit = PostpartumVisit.query.get(visit_id)
    if not visit:
        return jsonify({'success': False, 'message': '复诊记录不存在'}), 404
    db.session.delete(visit)
    db.session.commit()
    return jsonify({'success': True})


@care_med_bp.route('/medications', methods=['GET'])
def get_medications():
    user_id = request.args.get('user_id', 1, type=int)
    active_only = request.args.get('active_only', type=int)

    query = Medication.query.filter_by(user_id=user_id)
    if active_only:
        query = query.filter_by(is_active=True)

    meds = query.order_by(Medication.created_at.desc()).all()
    result = []
    today = date.today()
    for m in meds:
        today_taken = MedicationLog.query.filter_by(
            user_id=user_id, medication_id=m.id, log_date=today, status='taken'
        ).count()
        today_missed = MedicationLog.query.filter_by(
            user_id=user_id, medication_id=m.id, log_date=today, status='missed'
        ).count()
        visit_info = None
        if m.visit_id:
            v = PostpartumVisit.query.get(m.visit_id)
            if v:
                visit_info = {
                    'id': v.id,
                    'visit_type': v.visit_type,
                    'visit_date': v.visit_date.isoformat(),
                }
        result.append({
            'id': m.id,
            'visit_id': m.visit_id,
            'name': m.name,
            'category': m.category,
            'dosage': m.dosage,
            'frequency_per_day': m.frequency_per_day,
            'specific_times': m.specific_times,
            'start_date': m.start_date.isoformat() if m.start_date else None,
            'end_date': m.end_date.isoformat() if m.end_date else None,
            'meal_relation': m.meal_relation,
            'notes': m.notes,
            'is_active': m.is_active,
            'visit': visit_info,
            'today_taken': today_taken,
            'today_missed': today_missed,
            'today_expected': m.frequency_per_day or 1,
        })
    return jsonify({'success': True, 'data': result})


@care_med_bp.route('/medications', methods=['POST'])
def add_medication():
    data = request.get_json() or {}
    user_id = data.get('user_id', 1)
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'success': False, 'message': '药品名称不能为空'}), 400

    med = Medication(
        user_id=user_id,
        visit_id=data.get('visit_id'),
        name=name,
        category=data.get('category', '处方药'),
        dosage=data.get('dosage', ''),
        frequency_per_day=data.get('frequency_per_day', 1),
        specific_times=data.get('specific_times', ''),
        start_date=_parse_date(data.get('start_date')) or date.today(),
        end_date=_parse_date(data.get('end_date')),
        meal_relation=data.get('meal_relation', '无要求'),
        notes=data.get('notes', ''),
    )
    db.session.add(med)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': med.id}})


@care_med_bp.route('/medications/<int:med_id>', methods=['PUT'])
def update_medication(med_id):
    med = Medication.query.get(med_id)
    if not med:
        return jsonify({'success': False, 'message': '用药记录不存在'}), 404

    data = request.get_json() or {}
    for field in ['name', 'category', 'dosage', 'specific_times', 'meal_relation', 'notes']:
        if field in data:
            setattr(med, field, data[field])
    if 'frequency_per_day' in data:
        med.frequency_per_day = data['frequency_per_day']
    if 'start_date' in data:
        d = _parse_date(data['start_date'])
        if d:
            med.start_date = d
    if 'end_date' in data:
        d = _parse_date(data['end_date'])
        med.end_date = d
    if 'is_active' in data:
        med.is_active = bool(data['is_active'])
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': med.id}})


@care_med_bp.route('/medications/<int:med_id>', methods=['DELETE'])
def delete_medication(med_id):
    med = Medication.query.get(med_id)
    if not med:
        return jsonify({'success': False, 'message': '用药记录不存在'}), 404
    db.session.delete(med)
    db.session.commit()
    return jsonify({'success': True})


@care_med_bp.route('/medications/log', methods=['POST'])
def log_medication():
    data = request.get_json() or {}
    user_id = data.get('user_id', 1)
    medication_id = data.get('medication_id')
    status = data.get('status', 'taken')

    if not medication_id:
        return jsonify({'success': False, 'message': '缺少药品ID'}), 400
    if status not in MED_LOG_STATUS_LABELS:
        return jsonify({'success': False, 'message': '无效的状态值'}), 400

    med = Medication.query.get(medication_id)
    if not med:
        return jsonify({'success': False, 'message': '药品不存在'}), 404

    log_date = _parse_date(data.get('log_date')) or date.today()
    scheduled_time = data.get('scheduled_time', '')

    log = MedicationLog.query.filter_by(
        user_id=user_id,
        medication_id=medication_id,
        log_date=log_date,
        scheduled_time=scheduled_time,
    ).first()

    if not log:
        log = MedicationLog(
            user_id=user_id,
            medication_id=medication_id,
            log_date=log_date,
            scheduled_time=scheduled_time,
        )
        db.session.add(log)

    log.status = status
    if status == 'taken':
        log.actual_time = data.get('actual_time') or datetime.now().strftime('%H:%M')
    if 'note' in data:
        log.note = data['note']

    db.session.commit()
    return jsonify({'success': True, 'data': {'id': log.id, 'status': log.status}})


@care_med_bp.route('/medications/logs', methods=['GET'])
def get_med_logs():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 7, type=int)
    medication_id = request.args.get('medication_id', type=int)

    start = date.today() - timedelta(days=days - 1)
    query = MedicationLog.query.filter(
        MedicationLog.user_id == user_id,
        MedicationLog.log_date >= start,
    )
    if medication_id:
        query = query.filter_by(medication_id=medication_id)

    logs = query.order_by(MedicationLog.log_date.desc(), MedicationLog.id.asc()).all()
    result = []
    for l in logs:
        med = Medication.query.get(l.medication_id)
        result.append({
            'id': l.id,
            'medication_id': l.medication_id,
            'medication_name': med.name if med else '未知药品',
            'log_date': l.log_date.isoformat(),
            'scheduled_time': l.scheduled_time,
            'actual_time': l.actual_time,
            'status': l.status,
            'status_label': MED_LOG_STATUS_LABELS.get(l.status, l.status),
            'note': l.note,
        })
    return jsonify({'success': True, 'data': result})


@care_med_bp.route('/reactions', methods=['GET'])
def get_reactions():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)

    start = date.today() - timedelta(days=days - 1)
    reactions = AdverseReaction.query.filter(
        AdverseReaction.user_id == user_id,
        AdverseReaction.reaction_date >= start,
    ).order_by(AdverseReaction.reaction_date.desc()).all()

    result = []
    for r in reactions:
        med = Medication.query.get(r.medication_id) if r.medication_id else None
        result.append({
            'id': r.id,
            'medication_id': r.medication_id,
            'medication_name': med.name if med else None,
            'reaction_date': r.reaction_date.isoformat(),
            'symptom': r.symptom,
            'severity': r.severity,
            'severity_label': SEVERITY_LABELS.get(r.severity, ''),
            'description': r.description,
            'duration_hours': r.duration_hours,
            'action_taken': r.action_taken,
            'consulted_doctor': r.consulted_doctor,
        })
    return jsonify({'success': True, 'data': result})


@care_med_bp.route('/reactions', methods=['POST'])
def add_reaction():
    data = request.get_json() or {}
    user_id = data.get('user_id', 1)
    symptom = data.get('symptom', '').strip()
    if not symptom:
        return jsonify({'success': False, 'message': '症状描述不能为空'}), 400

    reaction = AdverseReaction(
        user_id=user_id,
        medication_id=data.get('medication_id'),
        reaction_date=_parse_date(data.get('reaction_date')) or date.today(),
        symptom=symptom,
        severity=data.get('severity', 3),
        description=data.get('description', ''),
        duration_hours=data.get('duration_hours', 0),
        action_taken=data.get('action_taken', ''),
        consulted_doctor=bool(data.get('consulted_doctor', False)),
    )
    db.session.add(reaction)
    db.session.commit()
    return jsonify({'success': True, 'data': {'id': reaction.id}})


@care_med_bp.route('/reactions/<int:reaction_id>', methods=['DELETE'])
def delete_reaction(reaction_id):
    reaction = AdverseReaction.query.get(reaction_id)
    if not reaction:
        return jsonify({'success': False, 'message': '不适反应记录不存在'}), 404
    db.session.delete(reaction)
    db.session.commit()
    return jsonify({'success': True})


@care_med_bp.route('/today', methods=['GET'])
def get_today():
    user_id = request.args.get('user_id', 1, type=int)
    todos = generate_today_todo(user_id)
    alerts, need_urgent = generate_alerts(user_id)
    return jsonify({
        'success': True,
        'data': {
            'todos': todos,
            'alerts': alerts,
            'need_urgent': need_urgent,
            'today': date.today().isoformat(),
        }
    })


@care_med_bp.route('/alerts', methods=['GET'])
def get_alerts():
    user_id = request.args.get('user_id', 1, type=int)
    alerts, need_urgent = generate_alerts(user_id)
    return jsonify({
        'success': True,
        'data': {
            'alerts': alerts,
            'need_urgent': need_urgent,
        }
    })


@care_med_bp.route('/stats', methods=['GET'])
def get_stats():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)

    today = date.today()
    start = today - timedelta(days=days - 1)

    visits = PostpartumVisit.query.filter(
        PostpartumVisit.user_id == user_id,
        PostpartumVisit.visit_date >= start,
        PostpartumVisit.visit_date <= today,
    ).all()

    total_visits = len(visits)
    completed_visits = len([v for v in visits if v.status == 'completed'])
    pending_visits = len([v for v in visits if v.status == 'pending'])
    overdue_visits = len([v for v in visits if v.status == 'pending' and v.visit_date < today])
    visit_completion_rate = round(completed_visits / total_visits * 100, 1) if total_visits > 0 else 0

    visit_type_counter = Counter(v.visit_type or '其他' for v in visits)
    visit_type_dist = []
    for vtype, count in visit_type_counter.most_common():
        c = len([v for v in visits if (v.visit_type or '其他') == vtype and v.status == 'completed'])
        visit_type_dist.append({
            'type': vtype,
            'count': count,
            'completed': c,
            'percentage': round(count / total_visits * 100, 1) if total_visits > 0 else 0,
        })

    daily_visit_rates = []
    for i in range(days):
        d = start + timedelta(days=i)
        day_visits = [v for v in visits if v.visit_date == d]
        day_total = len(day_visits)
        day_completed = len([v for v in day_visits if v.status == 'completed'])
        rate = round(day_completed / day_total * 100, 1) if day_total > 0 else 0
        daily_visit_rates.append({
            'date': d.isoformat(),
            'total': day_total,
            'completed': day_completed,
            'rate': rate,
        })

    active_meds = Medication.query.filter_by(user_id=user_id).filter(
        (Medication.start_date <= today) | (Medication.start_date.is_(None))
    ).all()
    med_ids = [m.id for m in active_meds]

    expected_total = 0
    taken_total = 0
    missed_total = 0

    for med in active_meds:
        med_start = med.start_date or start
        med_end = med.end_date or today
        actual_start = max(med_start, start)
        actual_end = min(med_end, today)
        if actual_start > actual_end:
            continue
        active_days = (actual_end - actual_start).days + 1
        expected_total += active_days * (med.frequency_per_day or 1)

    logs = MedicationLog.query.filter(
        MedicationLog.user_id == user_id,
        MedicationLog.log_date >= start,
        MedicationLog.log_date <= today,
    ).all()

    taken_total = len([l for l in logs if l.status == 'taken'])
    missed_total = len([l for l in logs if l.status == 'missed'])
    adherence_rate = round(taken_total / expected_total * 100, 1) if expected_total > 0 else 0

    daily_missed = defaultdict(int)
    daily_taken = defaultdict(int)
    daily_expected = defaultdict(int)

    for l in logs:
        d_str = l.log_date.isoformat()
        if l.status == 'taken':
            daily_taken[d_str] += 1
        elif l.status == 'missed':
            daily_missed[d_str] += 1

    for med in active_meds:
        med_start = med.start_date or start
        med_end = med.end_date or today
        actual_start = max(med_start, start)
        actual_end = min(med_end, today)
        if actual_start > actual_end:
            continue
        d = actual_start
        while d <= actual_end:
            daily_expected[d.isoformat()] += (med.frequency_per_day or 1)
            d += timedelta(days=1)

    daily_adherence = []
    missed_trend = []
    for i in range(days):
        d = start + timedelta(days=i)
        d_str = d.isoformat()
        exp = daily_expected.get(d_str, 0)
        tk = daily_taken.get(d_str, 0)
        ms = daily_missed.get(d_str, 0)
        rate = round(tk / exp * 100, 1) if exp > 0 else 0
        daily_adherence.append({
            'date': d_str,
            'expected': exp,
            'taken': tk,
            'missed': ms,
            'rate': rate,
        })
        missed_trend.append({
            'date': d_str,
            'missed': ms,
        })

    reactions = AdverseReaction.query.filter(
        AdverseReaction.user_id == user_id,
        AdverseReaction.reaction_date >= start,
        AdverseReaction.reaction_date <= today,
    ).all()

    total_reactions = len(reactions)
    severe_reactions = len([r for r in reactions if r.severity >= 4])

    symptom_counter = Counter(r.symptom for r in reactions)
    symptom_dist = []
    for symptom, count in symptom_counter.most_common():
        c = len([r for r in reactions if r.symptom == symptom])
        sev = sum(r.severity for r in reactions if r.symptom == symptom) / c
        symptom_dist.append({
            'symptom': symptom,
            'count': count,
            'avg_severity': round(sev, 1),
            'percentage': round(count / total_reactions * 100, 1) if total_reactions > 0 else 0,
        })

    severity_counter = Counter(r.severity for r in reactions)
    severity_dist = []
    for sev in sorted(severity_counter.keys()):
        severity_dist.append({
            'severity': sev,
            'severity_label': SEVERITY_LABELS.get(sev, ''),
            'count': severity_counter[sev],
            'percentage': round(severity_counter[sev] / total_reactions * 100, 1) if total_reactions > 0 else 0,
        })

    consecutive_missed = _consecutive_missed_days(user_id)
    emotion_state = _recent_emotion_state(user_id)

    return jsonify({
        'success': True,
        'data': {
            'period_days': days,
            'visits': {
                'total': total_visits,
                'completed': completed_visits,
                'pending': pending_visits,
                'overdue': overdue_visits,
                'completion_rate': visit_completion_rate,
                'type_distribution': visit_type_dist,
                'daily_rates': daily_visit_rates,
            },
            'medication': {
                'expected_total': expected_total,
                'taken_total': taken_total,
                'missed_total': missed_total,
                'adherence_rate': adherence_rate,
                'daily_adherence': daily_adherence,
                'missed_trend': missed_trend,
                'consecutive_missed_days': consecutive_missed,
                'active_medication_count': len([m for m in active_meds if m.is_active]),
            },
            'reactions': {
                'total': total_reactions,
                'severe_count': severe_reactions,
                'symptom_distribution': symptom_dist,
                'severity_distribution': severity_dist,
            },
            'emotion_state': emotion_state,
        }
    })


@care_med_bp.route('/history', methods=['GET'])
def get_history():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)

    today = date.today()
    start = today - timedelta(days=days - 1)

    visits = PostpartumVisit.query.filter(
        PostpartumVisit.user_id == user_id,
        PostpartumVisit.visit_date >= start,
    ).order_by(PostpartumVisit.visit_date.desc()).all()

    logs = MedicationLog.query.filter(
        MedicationLog.user_id == user_id,
        MedicationLog.log_date >= start,
    ).order_by(MedicationLog.log_date.desc(), MedicationLog.id.asc()).all()

    reactions = AdverseReaction.query.filter(
        AdverseReaction.user_id == user_id,
        AdverseReaction.reaction_date >= start,
    ).order_by(AdverseReaction.reaction_date.desc()).all()

    history = []

    for v in visits:
        meds = Medication.query.filter_by(visit_id=v.id).count()
        history.append({
            'date': v.visit_date.isoformat(),
            'type': 'visit',
            'data': {
                'id': v.id,
                'visit_type': v.visit_type,
                'hospital': v.hospital,
                'status': v.status,
                'status_label': VISIT_STATUS_LABELS.get(v.status, v.status),
                'medication_count': meds,
            }
        })

    for l in logs:
        med = Medication.query.get(l.medication_id)
        history.append({
            'date': l.log_date.isoformat(),
            'type': 'med_log',
            'data': {
                'id': l.id,
                'medication_name': med.name if med else '未知',
                'status': l.status,
                'status_label': MED_LOG_STATUS_LABELS.get(l.status, l.status),
                'scheduled_time': l.scheduled_time,
                'actual_time': l.actual_time,
            }
        })

    for r in reactions:
        med = Medication.query.get(r.medication_id) if r.medication_id else None
        history.append({
            'date': r.reaction_date.isoformat(),
            'type': 'reaction',
            'data': {
                'id': r.id,
                'symptom': r.symptom,
                'severity': r.severity,
                'severity_label': SEVERITY_LABELS.get(r.severity, ''),
                'medication_name': med.name if med else None,
                'consulted_doctor': r.consulted_doctor,
            }
        })

    history.sort(key=lambda x: x['date'], reverse=True)
    return jsonify({'success': True, 'data': history})
