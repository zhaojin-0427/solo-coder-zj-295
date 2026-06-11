from flask import Blueprint, request, jsonify
from models import db, CounselingResource

resource_bp = Blueprint('resources', __name__)


@resource_bp.route('/list', methods=['GET'])
def get_resources():
    is_emergency = request.args.get('emergency', None)

    query = CounselingResource.query

    if is_emergency is not None:
        emergency_flag = is_emergency.lower() == 'true'
        query = query.filter_by(is_emergency=emergency_flag)

    resources = query.order_by(CounselingResource.is_emergency.desc(), CounselingResource.id.asc()).all()

    result = []
    for r in resources:
        result.append({
            'id': r.id,
            'title': r.title,
            'description': r.description,
            'contact': r.contact,
            'type': r.type,
            'is_emergency': r.is_emergency
        })

    return jsonify({'success': True, 'data': result})


@resource_bp.route('/emergency', methods=['GET'])
def get_emergency_resources():
    resources = CounselingResource.query.filter_by(
        is_emergency=True
    ).order_by(CounselingResource.id.asc()).all()

    result = []
    for r in resources:
        result.append({
            'id': r.id,
            'title': r.title,
            'description': r.description,
            'contact': r.contact,
            'type': r.type
        })

    return jsonify({'success': True, 'data': result})


@resource_bp.route('/add', methods=['POST'])
def add_resource():
    data = request.get_json()
    title = data.get('title')
    description = data.get('description', '')
    contact = data.get('contact', '')
    type = data.get('type', 'hotline')
    is_emergency = data.get('is_emergency', False)

    if not title:
        return jsonify({'success': False, 'message': '标题为必填项'}), 400

    resource = CounselingResource(
        title=title,
        description=description,
        contact=contact,
        type=type,
        is_emergency=is_emergency
    )
    db.session.add(resource)
    db.session.commit()

    return jsonify({'success': True, 'data': {'id': resource.id}})


@resource_bp.route('/tips', methods=['GET'])
def get_self_care_tips():
    tips = [
        {
            'id': 1,
            'title': '深呼吸放松法',
            'content': '找一个安静的地方，闭上眼睛，慢慢吸气4秒，屏息4秒，慢慢呼气6秒。重复5-10次，可以有效缓解焦虑情绪。',
            'category': '放松技巧'
        },
        {
            'id': 2,
            'title': '5-4-3-2-1接地法',
            'content': '当感到情绪失控时，试着说出：5个你能看到的东西，4个你能摸到的东西，3个你能听到的东西，2个你能闻到的东西，1个你能尝到的东西。',
            'category': '情绪调节'
        },
        {
            'id': 3,
            'title': '寻求帮助是勇敢的表现',
            'content': '记住，寻求帮助不是软弱的表现，而是对自己和宝宝负责的表现。你不需要一个人承担所有的压力。',
            'category': '心理建设'
        },
        {
            'id': 4,
            'title': '给自己一点时间',
            'content': '每天给自己15-30分钟的独处时间，做一件让自己开心的小事：泡一杯茶、听一首歌、看一段短视频。',
            'category': '自我关爱'
        },
        {
            'id': 5,
            'title': '适度运动改善情绪',
            'content': '产后适度运动（如散步、瑜伽）可以促进内啡肽分泌，改善情绪。建议从每天10分钟开始，循序渐进。',
            'category': '身体调节'
        },
        {
            'id': 6,
            'title': '保持社交联系',
            'content': '即使不想出门，也可以通过电话、视频和朋友家人聊聊天。社交支持是应对产后情绪问题的重要资源。',
            'category': '社交支持'
        }
    ]

    return jsonify({'success': True, 'data': tips})
