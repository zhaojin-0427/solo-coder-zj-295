import os
from flask import Flask
from flask_cors import CORS
from models import db

def create_app():
    app = Flask(__name__)
    CORS(app)

    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'mood_tracker.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'postpartum-mood-tracker-secret-key'

    db.init_app(app)

    from routes.emotion_routes import emotion_bp
    from routes.stress_routes import stress_bp
    from routes.message_routes import message_bp
    from routes.baby_routes import baby_bp
    from routes.stats_routes import stats_bp
    from routes.resource_routes import resource_bp
    from routes.user_routes import user_bp
    from routes.care_routes import care_bp
    from routes.care_med_routes import care_med_bp
    from routes.feeding_routes import feeding_bp

    app.register_blueprint(emotion_bp, url_prefix='/api/emotion')
    app.register_blueprint(stress_bp, url_prefix='/api/stress')
    app.register_blueprint(message_bp, url_prefix='/api/messages')
    app.register_blueprint(baby_bp, url_prefix='/api/baby')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    app.register_blueprint(resource_bp, url_prefix='/api/resources')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(care_bp, url_prefix='/api/care')
    app.register_blueprint(care_med_bp, url_prefix='/api/care-med')
    app.register_blueprint(feeding_bp, url_prefix='/api/feeding')

    with app.app_context():
        db.create_all()
        seed_data()

    return app


def seed_data():
    from models import CounselingResource, User
    from datetime import date

    if User.query.count() == 0:
        mom = User(name='新手妈妈', role='mom')
        partner = User(name='爸爸', role='partner')
        db.session.add_all([mom, partner])
        db.session.commit()

    if CounselingResource.query.count() == 0:
        resources = [
            CounselingResource(
                title='全国心理援助热线',
                description='24小时免费心理援助服务，专业心理咨询师在线倾听',
                contact='400-161-9995',
                type='hotline',
                is_emergency=True
            ),
            CounselingResource(
                title='北京心理危机研究与干预中心',
                description='专业心理危机干预服务，提供24小时热线咨询',
                contact='010-82951332',
                type='hotline',
                is_emergency=True
            ),
            CounselingResource(
                title='产后抑郁互助社区',
                description='妈妈们的线上互助社区，分享经验，互相支持',
                contact='www.mommymoodsupport.cn',
                type='community',
                is_emergency=False
            ),
            CounselingResource(
                title='妇幼保健院心理门诊',
                description='专业产后心理健康评估与咨询服务',
                contact='请联系当地妇幼保健院',
                type='clinic',
                is_emergency=False
            ),
            CounselingResource(
                title='正念冥想APP推荐',
                description='通过正念冥想缓解焦虑情绪，推荐Headspace、潮汐等应用',
                contact='应用商店搜索"冥想"',
                type='app',
                is_emergency=False
            ),
            CounselingResource(
                title='希望24热线',
                description='专业心理援助热线，24小时全天候服务',
                contact='400-161-9995',
                type='hotline',
                is_emergency=True
            ),
            CounselingResource(
                title='全国妇幼健康热线',
                description='提供母乳喂养咨询、妇幼健康指导等专业服务',
                contact='12320',
                type='hotline',
                is_emergency=True
            ),
            CounselingResource(
                title='中国妇幼保健协会',
                description='专业母乳喂养指导和母婴健康服务',
                contact='www.chinawch.org',
                type='organization',
                is_emergency=False
            ),
            CounselingResource(
                title='国际母乳会(中国)',
                description='非营利性母乳喂养支持组织，提供免费哺乳指导',
                contact='www.llli.org/cn',
                type='organization',
                is_emergency=False
            ),
            CounselingResource(
                title='母乳喂养APP推荐',
                description='推荐：妈妈网孕育、宝宝树、亲宝宝等，记录喂养数据，获取专业指导',
                contact='应用商店搜索"母乳喂养"',
                type='app',
                is_emergency=False
            ),
        ]
        db.session.add_all(resources)
        db.session.commit()


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=9302, debug=True)
