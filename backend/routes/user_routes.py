from flask import Blueprint, request, jsonify
from models import db, User

user_bp = Blueprint('user', __name__)


@user_bp.route('/list', methods=['GET'])
def get_users():
    users = User.query.all()
    result = []
    for u in users:
        result.append({
            'id': u.id,
            'name': u.name,
            'role': u.role,
            'created_at': u.created_at.isoformat()
        })
    return jsonify({'success': True, 'data': result})


@user_bp.route('/mom', methods=['GET'])
def get_mom_user():
    mom = User.query.filter_by(role='mom').first()
    if not mom:
        return jsonify({'success': False, 'message': '未找到妈妈用户'}), 404

    return jsonify({
        'success': True,
        'data': {
            'id': mom.id,
            'name': mom.name,
            'role': mom.role
        }
    })


@user_bp.route('/partner', methods=['GET'])
def get_partner_user():
    partner = User.query.filter_by(role='partner').first()
    if not partner:
        return jsonify({'success': False, 'message': '未找到伴侣用户'}), 404

    return jsonify({
        'success': True,
        'data': {
            'id': partner.id,
            'name': partner.name,
            'role': partner.role
        }
    })


@user_bp.route('/current', methods=['GET'])
def get_current_user():
    role = request.args.get('role', 'mom')
    user = User.query.filter_by(role=role).first()
    if not user:
        return jsonify({'success': False, 'message': '用户不存在'}), 404

    return jsonify({
        'success': True,
        'data': {
            'id': user.id,
            'name': user.name,
            'role': user.role
        }
    })
