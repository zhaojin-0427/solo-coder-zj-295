from flask import Blueprint, request, jsonify
from datetime import date, timedelta
from collections import defaultdict
from models import db, EmotionRecord, StressRecord, SupportUsage, BabySchedule

stats_bp = Blueprint('stats', __name__)


@stats_bp.route('/emotion-trend', methods=['GET'])
def emotion_trend():
    user_id = request.args.get('user_id', 1, type=int)
    period = request.args.get('period', 'week')

    if period == 'week':
        days = 7
    elif period == 'month':
        days = 30
    else:
        days = 7

    start_date = date.today() - timedelta(days=days - 1)

    records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= start_date
    ).order_by(EmotionRecord.record_date.asc()).all()

    date_map = {}
    for r in records:
        date_map[r.record_date.isoformat()] = {
            'emotion_score': r.emotion_score,
            'sleep_quality': r.sleep_quality,
            'sleep_hours': r.sleep_hours,
            'self_assessment': r.self_assessment
        }

    result = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        d_str = d.isoformat()
        if d_str in date_map:
            result.append({
                'date': d_str,
                'emotion_score': date_map[d_str]['emotion_score'],
                'sleep_quality': date_map[d_str]['sleep_quality'],
                'sleep_hours': date_map[d_str]['sleep_hours'],
                'self_assessment': date_map[d_str]['self_assessment']
            })
        else:
            result.append({
                'date': d_str,
                'emotion_score': None,
                'sleep_quality': None,
                'sleep_hours': None,
                'self_assessment': None
            })

    return jsonify({'success': True, 'data': result})


@stats_bp.route('/stress-distribution', methods=['GET'])
def stress_distribution():
    user_id = request.args.get('user_id', 1, type=int)
    period = request.args.get('period', 'week')

    days = 7 if period == 'week' else 30
    start_date = date.today() - timedelta(days=days)

    records = StressRecord.query.filter(
        StressRecord.user_id == user_id,
        StressRecord.record_date >= start_date
    ).all()

    type_count = defaultdict(int)
    type_severity = defaultdict(list)

    for r in records:
        type_count[r.stress_type] += 1
        type_severity[r.stress_type].append(r.severity)

    result = []
    for stype, count in type_count.items():
        avg_sev = sum(type_severity[stype]) / len(type_severity[stype]) if type_severity[stype] else 0
        result.append({
            'type': stype,
            'count': count,
            'avg_severity': round(avg_sev, 1),
            'percentage': round(count / len(records) * 100, 1) if records else 0
        })

    result.sort(key=lambda x: x['count'], reverse=True)

    return jsonify({'success': True, 'data': result})


@stats_bp.route('/support-count', methods=['GET'])
def support_count():
    user_id = request.args.get('user_id', 1, type=int)
    period = request.args.get('period', 'week')

    days = 7 if period == 'week' else 30
    start_date = date.today() - timedelta(days=days)

    records = SupportUsage.query.filter(
        SupportUsage.user_id == user_id,
        SupportUsage.record_date >= start_date,
        SupportUsage.used == True
    ).all()

    type_count = defaultdict(int)
    type_helpfulness = defaultdict(list)

    for r in records:
        type_count[r.support_type] += 1
        if r.helpfulness > 0:
            type_helpfulness[r.support_type].append(r.helpfulness)

    result = []
    for stype, count in type_count.items():
        avg_help = sum(type_helpfulness[stype]) / len(type_helpfulness[stype]) if type_helpfulness[stype] else 0
        result.append({
            'type': stype,
            'count': count,
            'avg_helpfulness': round(avg_help, 1)
        })

    result.sort(key=lambda x: x['count'], reverse=True)

    total_support = sum(type_count.values())

    return jsonify({
        'success': True,
        'data': {
            'total_support_days': len(set(r.record_date for r in records)),
            'total_support_count': total_support,
            'by_type': result
        }
    })


@stats_bp.route('/recovery-curve', methods=['GET'])
def recovery_curve():
    user_id = request.args.get('user_id', 1, type=int)
    period = request.args.get('period', 'month')

    days = 30 if period == 'month' else 90
    start_date = date.today() - timedelta(days=days - 1)

    records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= start_date
    ).order_by(EmotionRecord.record_date.asc()).all()

    if not records:
        return jsonify({'success': True, 'data': []})

    result = []
    for r in records:
        result.append({
            'date': r.record_date.isoformat(),
            'self_assessment': r.self_assessment,
            'emotion_score': r.emotion_score
        })

    return jsonify({'success': True, 'data': result})


@stats_bp.route('/overview', methods=['GET'])
def get_overview():
    user_id = request.args.get('user_id', 1, type=int)

    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    week_records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= week_ago
    ).all()

    month_records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= month_ago
    ).all()

    week_avg_emotion = sum(r.emotion_score for r in week_records) / len(week_records) if week_records else 0
    month_avg_emotion = sum(r.emotion_score for r in month_records) / len(month_records) if month_records else 0

    week_avg_sleep = sum(r.sleep_hours for r in week_records) / len(week_records) if week_records else 0

    week_stress = StressRecord.query.filter(
        StressRecord.user_id == user_id,
        StressRecord.record_date >= week_ago
    ).count()

    support_count = SupportUsage.query.filter(
        SupportUsage.user_id == user_id,
        SupportUsage.record_date >= week_ago,
        SupportUsage.used == True
    ).count()

    return jsonify({
        'success': True,
        'data': {
            'week_avg_emotion': round(week_avg_emotion, 1),
            'month_avg_emotion': round(month_avg_emotion, 1),
            'week_avg_sleep_hours': round(week_avg_sleep, 1),
            'week_stress_count': week_stress,
            'week_support_count': support_count,
            'record_days_week': len(week_records),
            'record_days_month': len(month_records)
        }
    })


@stats_bp.route('/baby-emotion-correlation', methods=['GET'])
def baby_emotion_correlation():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 14, type=int)

    start_date = date.today() - timedelta(days=days)

    emotion_records = EmotionRecord.query.filter(
        EmotionRecord.user_id == user_id,
        EmotionRecord.record_date >= start_date
    ).all()

    baby_records = BabySchedule.query.filter(
        BabySchedule.user_id == user_id,
        BabySchedule.record_date >= start_date
    ).all()

    emotion_map = {r.record_date: r for r in emotion_records}
    baby_map = {r.record_date: r for r in baby_records}

    all_dates = set(emotion_map.keys()) | set(baby_map.keys())

    result = []
    for d in sorted(all_dates):
        emo = emotion_map.get(d)
        baby = baby_map.get(d)
        result.append({
            'date': d.isoformat(),
            'emotion_score': emo.emotion_score if emo else None,
            'sleep_quality': emo.sleep_quality if emo else None,
            'baby_sleep_hours': baby.sleep_total_hours if baby else None,
            'baby_feed_count': baby.feed_count if baby else None,
            'baby_crying_duration': baby.crying_duration if baby else None
        })

    return jsonify({'success': True, 'data': result})
