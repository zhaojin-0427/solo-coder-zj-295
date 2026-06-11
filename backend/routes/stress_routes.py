from flask import Blueprint, request, jsonify
from datetime import date, timedelta
from models import db, StressRecord

stress_bp = Blueprint('stress', __name__)


@stress_bp.route('/records', methods=['GET'])
def get_stress_records():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)
    stress_type = request.args.get('type', None)
    start_date = date.today() - timedelta(days=days)

    query = StressRecord.query.filter(
        StressRecord.user_id == user_id,
        StressRecord.record_date >= start_date
    )

    if stress_type:
        query = query.filter(StressRecord.stress_type == stress_type)

    records = query.order_by(StressRecord.record_date.desc()).all()

    result = []
    for r in records:
        result.append({
            'id': r.id,
            'stress_type': r.stress_type,
            'severity': r.severity,
            'description': r.description,
            'record_date': r.record_date.isoformat(),
            'created_at': r.created_at.isoformat()
        })

    return jsonify({'success': True, 'data': result})


@stress_bp.route('/record', methods=['POST'])
def add_stress_record():
    data = request.get_json()
    user_id = data.get('user_id', 1)
    stress_type = data.get('stress_type')
    severity = data.get('severity', 3)
    description = data.get('description', '')

    if not stress_type:
        return jsonify({'success': False, 'message': '压力类型为必填项'}), 400

    record = StressRecord(
        user_id=user_id,
        stress_type=stress_type,
        severity=severity,
        description=description
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({'success': True, 'data': {'id': record.id}})


@stress_bp.route('/summary', methods=['GET'])
def get_stress_summary():
    user_id = request.args.get('user_id', 1, type=int)
    days = request.args.get('days', 30, type=int)
    start_date = date.today() - timedelta(days=days)

    records = StressRecord.query.filter(
        StressRecord.user_id == user_id,
        StressRecord.record_date >= start_date
    ).all()

    type_count = {}
    type_severity = {}

    for r in records:
        if r.stress_type not in type_count:
            type_count[r.stress_type] = 0
            type_severity[r.stress_type] = []
        type_count[r.stress_type] += 1
        type_severity[r.stress_type].append(r.severity)

    result = []
    for stype, count in type_count.items():
        avg_severity = sum(type_severity[stype]) / len(type_severity[stype]) if type_severity[stype] else 0
        result.append({
            'type': stype,
            'count': count,
            'avg_severity': round(avg_severity, 1)
        })

    result.sort(key=lambda x: x['count'], reverse=True)

    return jsonify({'success': True, 'data': result})
