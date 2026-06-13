from flask import Blueprint, request, jsonify
from datetime import date, timedelta
from models import db, BabySchedule, CareSuggestion

baby_bp = Blueprint('baby', __name__)


@baby_bp.route('/schedules', methods=['GET'])
def get_schedules():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)
    start_date = date.today() - timedelta(days=days)

    schedules = BabySchedule.query.filter(
        BabySchedule.user_id == user_id,
        BabySchedule.record_date >= start_date
    ).order_by(BabySchedule.record_date.desc()).all()

    result = []
    for s in schedules:
        result.append({
            'id': s.id,
            'record_date': s.record_date.isoformat(),
            'sleep_total_hours': s.sleep_total_hours,
            'feed_count': s.feed_count,
            'crying_duration': s.crying_duration,
            'note': s.note,
            'created_at': s.created_at.isoformat()
        })

    return jsonify({'success': True, 'data': result})


@baby_bp.route('/schedule', methods=['POST'])
def add_schedule():
    data = request.get_json()
    user_id = data.get('user_id', 1)
    record_date = data.get('record_date', date.today().isoformat())
    sleep_total_hours = data.get('sleep_total_hours', 0)
    feed_count = data.get('feed_count', 0)
    crying_duration = data.get('crying_duration', 0)
    note = data.get('note', '')

    record_date_obj = date.fromisoformat(record_date) if isinstance(record_date, str) else record_date

    existing = BabySchedule.query.filter_by(
        user_id=user_id,
        record_date=record_date_obj
    ).first()

    if existing:
        existing.sleep_total_hours = sleep_total_hours
        existing.feed_count = feed_count
        existing.crying_duration = crying_duration
        existing.note = note
        schedule = existing
    else:
        schedule = BabySchedule(
            user_id=user_id,
            record_date=record_date_obj,
            sleep_total_hours=sleep_total_hours,
            feed_count=feed_count,
            crying_duration=crying_duration,
            note=note
        )
        db.session.add(schedule)

    db.session.commit()

    CareSuggestion.query.filter_by(
        user_id=user_id,
        suggestion_date=record_date_obj,
        status='pending'
    ).delete()
    db.session.commit()

    return jsonify({'success': True, 'data': {'id': schedule.id}})


@baby_bp.route('/today', methods=['GET'])
def get_today_schedule():
    user_id = request.args.get('user_id', 1, type=int)
    today = date.today()

    schedule = BabySchedule.query.filter_by(
        user_id=user_id,
        record_date=today
    ).first()

    if not schedule:
        return jsonify({'success': True, 'data': None})

    return jsonify({
        'success': True,
        'data': {
            'id': schedule.id,
            'record_date': schedule.record_date.isoformat(),
            'sleep_total_hours': schedule.sleep_total_hours,
            'feed_count': schedule.feed_count,
            'crying_duration': schedule.crying_duration,
            'note': schedule.note
        }
    })


@baby_bp.route('/summary', methods=['GET'])
def get_baby_summary():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 7, type=int)
    start_date = date.today() - timedelta(days=days)

    schedules = BabySchedule.query.filter(
        BabySchedule.user_id == user_id,
        BabySchedule.record_date >= start_date
    ).all()

    if not schedules:
        return jsonify({
            'success': True,
            'data': {
                'avg_sleep_hours': 0,
                'avg_feed_count': 0,
                'avg_crying_duration': 0,
                'total_days': 0
            }
        })

    total_sleep = sum(s.sleep_total_hours for s in schedules)
    total_feed = sum(s.feed_count for s in schedules)
    total_crying = sum(s.crying_duration for s in schedules)
    count = len(schedules)

    return jsonify({
        'success': True,
        'data': {
            'avg_sleep_hours': round(total_sleep / count, 1),
            'avg_feed_count': round(total_feed / count, 1),
            'avg_crying_duration': round(total_crying / count, 0),
            'total_days': count
        }
    })
