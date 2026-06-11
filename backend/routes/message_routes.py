from flask import Blueprint, request, jsonify
from models import db, Message, User

message_bp = Blueprint('messages', __name__)


@message_bp.route('/inbox', methods=['GET'])
def get_inbox():
    recipient_id = request.args.get('recipient_id', 1, type=int)

    messages = Message.query.filter_by(
        recipient_id=recipient_id
    ).order_by(Message.created_at.desc()).all()

    result = []
    for m in messages:
        sender = User.query.get(m.sender_id)
        result.append({
            'id': m.id,
            'sender_name': '匿名' if m.is_anonymous else (sender.name if sender else '未知'),
            'content': m.content,
            'is_anonymous': m.is_anonymous,
            'is_viewed': m.is_viewed,
            'created_at': m.created_at.isoformat()
        })

    return jsonify({'success': True, 'data': result})


@message_bp.route('/unread-count', methods=['GET'])
def get_unread_count():
    recipient_id = request.args.get('recipient_id', 1, type=int)

    count = Message.query.filter_by(
        recipient_id=recipient_id,
        is_viewed=False
    ).count()

    return jsonify({'success': True, 'data': {'count': count}})


@message_bp.route('/send', methods=['POST'])
def send_message():
    data = request.get_json()
    sender_id = data.get('sender_id', 2)
    recipient_id = data.get('recipient_id', 1)
    content = data.get('content', '')
    is_anonymous = data.get('is_anonymous', True)

    if not content.strip():
        return jsonify({'success': False, 'message': '留言内容不能为空'}), 400

    message = Message(
        sender_id=sender_id,
        recipient_id=recipient_id,
        content=content.strip(),
        is_anonymous=is_anonymous
    )
    db.session.add(message)
    db.session.commit()

    return jsonify({'success': True, 'data': {'id': message.id}})


@message_bp.route('/view/<int:message_id>', methods=['POST'])
def mark_viewed(message_id):
    message = Message.query.get(message_id)
    if not message:
        return jsonify({'success': False, 'message': '留言不存在'}), 404

    message.is_viewed = True
    db.session.commit()

    return jsonify({'success': True})


@message_bp.route('/view-all', methods=['POST'])
def mark_all_viewed():
    data = request.get_json()
    recipient_id = data.get('recipient_id', 1)

    Message.query.filter_by(
        recipient_id=recipient_id,
        is_viewed=False
    ).update({'is_viewed': True})
    db.session.commit()

    return jsonify({'success': True})


@message_bp.route('/sent', methods=['GET'])
def get_sent_messages():
    sender_id = request.args.get('sender_id', 2, type=int)

    messages = Message.query.filter_by(
        sender_id=sender_id
    ).order_by(Message.created_at.desc()).all()

    result = []
    for m in messages:
        result.append({
            'id': m.id,
            'content': m.content,
            'is_anonymous': m.is_anonymous,
            'is_viewed': m.is_viewed,
            'recipient_id': m.recipient_id,
            'created_at': m.created_at.isoformat()
        })

    return jsonify({'success': True, 'data': result})
