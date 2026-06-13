from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
from models import db, EmotionRecord, StressRecord, SupportUsage, LowMoodAlert, CounselingResource, CareSuggestion

emotion_bp = Blueprint('emotion', __name__)

STRESS_TYPES = ['喂奶', '哄睡', '健康担忧', '身体恢复', '情绪波动', '社交隔离', '家庭关系', '经济压力', '其他']
SUPPORT_TYPES = ['家人', '伴侣', '朋友', '专业人士', '线上社区', '其他']


@emotion_bp.route('/records', methods=['GET'])
def get_records():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)
    start_date = date.today() - timedelta(days=days)

    records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= start_date
    ).order_by(EmotionRecord.record_date.desc()).all()

    result = []
    for r in records:
        stress_items = [s.stress_type for s in r.stress_items]
        support_items = [{'type': s.support_type, 'used': s.used, 'helpfulness': s.helpfulness}
                         for s in r.support_items]
        result.append({
            'id': r.id,
            'record_date': r.record_date.isoformat(),
            'emotion_score': r.emotion_score,
            'sleep_quality': r.sleep_quality,
            'sleep_hours': r.sleep_hours,
            'note': r.note,
            'self_assessment': r.self_assessment,
            'stress_types': stress_items,
            'support_usage': support_items,
            'created_at': r.created_at.isoformat()
        })

    return jsonify({'success': True, 'data': result})


@emotion_bp.route('/record', methods=['POST'])
def add_record():
    data = request.get_json()
    user_id = data.get('user_id', 1)
    record_date = data.get('record_date', date.today().isoformat())
    emotion_score = data.get('emotion_score')
    sleep_quality = data.get('sleep_quality')
    sleep_hours = data.get('sleep_hours', 0)
    note = data.get('note', '')
    self_assessment = data.get('self_assessment', 5)
    stress_types = data.get('stress_types', [])
    support_usage = data.get('support_usage', [])

    if emotion_score is None or sleep_quality is None:
        return jsonify({'success': False, 'message': '情绪评分和睡眠质量为必填项'}), 400

    record_date_obj = date.fromisoformat(record_date) if isinstance(record_date, str) else record_date

    existing = EmotionRecord.query.filter_by(
        user_id=user_id,
        record_date=record_date_obj
    ).first()

    if existing:
        existing.emotion_score = emotion_score
        existing.sleep_quality = sleep_quality
        existing.sleep_hours = sleep_hours
        existing.note = note
        existing.self_assessment = self_assessment
        StressRecord.query.filter_by(emotion_record_id=existing.id).delete()
        SupportUsage.query.filter_by(emotion_record_id=existing.id).delete()
        record = existing
    else:
        record = EmotionRecord(
            user_id=user_id,
            record_date=record_date_obj,
            emotion_score=emotion_score,
            sleep_quality=sleep_quality,
            sleep_hours=sleep_hours,
            note=note,
            self_assessment=self_assessment
        )
        db.session.add(record)
        db.session.flush()

    for st in stress_types:
        stress = StressRecord(
            user_id=user_id,
            emotion_record_id=record.id,
            stress_type=st,
            record_date=record_date_obj
        )
        db.session.add(stress)

    for su in support_usage:
        support = SupportUsage(
            user_id=user_id,
            emotion_record_id=record.id,
            support_type=su.get('type', ''),
            used=su.get('used', False),
            helpfulness=su.get('helpfulness', 0),
            record_date=record_date_obj
        )
        db.session.add(support)

    db.session.commit()

    CareSuggestion.query.filter_by(
        user_id=user_id,
        suggestion_date=record_date_obj,
        status='pending'
    ).delete()
    db.session.commit()

    alert = check_low_mood(user_id)

    return jsonify({
        'success': True,
        'data': {'id': record.id},
        'alert': alert
    })


@emotion_bp.route('/today', methods=['GET'])
def get_today_record():
    user_id = request.args.get('user_id', 1, type=int)
    today = date.today()

    record = EmotionRecord.query.filter_by(
        user_id=user_id,
        record_date=today
    ).first()

    if not record:
        return jsonify({'success': True, 'data': None})

    stress_items = [s.stress_type for s in record.stress_items]
    support_items = [{'type': s.support_type, 'used': s.used, 'helpfulness': s.helpfulness}
                     for s in record.support_items]

    return jsonify({
        'success': True,
        'data': {
            'id': record.id,
            'record_date': record.record_date.isoformat(),
            'emotion_score': record.emotion_score,
            'sleep_quality': record.sleep_quality,
            'sleep_hours': record.sleep_hours,
            'note': record.note,
            'self_assessment': record.self_assessment,
            'stress_types': stress_items,
            'support_usage': support_items
        }
    })


def check_low_mood(user_id):
    threshold_days = 3
    low_score_threshold = 4

    end_date = date.today()
    start_date = end_date - timedelta(days=14)

    records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= start_date,
        EmotionRecord.record_date <= end_date
    ).order_by(EmotionRecord.record_date.desc()).all()

    if not records:
        return None

    consecutive_low = 0
    low_days = []
    total_score = 0

    for r in records:
        if r.emotion_score <= low_score_threshold:
            consecutive_low += 1
            low_days.append(r.record_date.isoformat())
            total_score += r.emotion_score
        else:
            break

    if consecutive_low >= threshold_days:
        avg_score = total_score / consecutive_low if consecutive_low > 0 else 0

        resources = CounselingResource.query.filter_by(is_emergency=True).all()
        resources_list = [{'title': r.title, 'contact': r.contact, 'description': r.description}
                          for r in resources]

        existing_alert = LowMoodAlert.query.filter_by(
            user_id=user_id,
            alert_date=date.today()
        ).first()

        if not existing_alert:
            alert = LowMoodAlert(
                user_id=user_id,
                alert_date=date.today(),
                consecutive_low_days=consecutive_low,
                average_score=avg_score,
                resources_pushed=str(resources_list)
            )
            db.session.add(alert)
            db.session.commit()

        return {
            'consecutive_low_days': consecutive_low,
            'average_score': round(avg_score, 1),
            'low_days': low_days,
            'resources': resources_list,
            'message': f'您已连续 {consecutive_low} 天情绪较低，建议关注自己的心理健康，以下是一些专业资源供您参考。'
        }

    return None


@emotion_bp.route('/stress-types', methods=['GET'])
def get_stress_types():
    return jsonify({'success': True, 'data': STRESS_TYPES})


@emotion_bp.route('/support-types', methods=['GET'])
def get_support_types():
    return jsonify({'success': True, 'data': SUPPORT_TYPES})


@emotion_bp.route('/alerts', methods=['GET'])
def get_alerts():
    user_id = request.args.get('user_id', 1, type=int)

    alerts = LowMoodAlert.query.filter_by(
        user_id=user_id
    ).order_by(LowMoodAlert.created_at.desc()).limit(10).all()

    result = []
    for a in alerts:
        resources = []
        try:
            resources = eval(a.resources_pushed) if a.resources_pushed else []
        except:
            resources = []

        result.append({
            'id': a.id,
            'alert_date': a.alert_date.isoformat(),
            'consecutive_low_days': a.consecutive_low_days,
            'average_score': a.average_score,
            'resources': resources,
            'is_acknowledged': a.is_acknowledged,
            'message': f'您已连续 {a.consecutive_low_days} 天情绪评分较低，请注意心理调适。'
        })

    return jsonify({'success': True, 'data': result})


@emotion_bp.route('/alert/acknowledge/<int:alert_id>', methods=['POST'])
def acknowledge_alert(alert_id):
    alert = LowMoodAlert.query.get(alert_id)
    if not alert:
        return jsonify({'success': False, 'message': '提醒不存在'}), 404

    alert.is_acknowledged = True
    db.session.commit()

    return jsonify({'success': True, 'message': '已确认收到提醒'})
