from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='mom')
    created_at = db.Column(db.DateTime, default=datetime.now)

    emotion_records = db.relationship('EmotionRecord', backref='user', lazy=True)
    stress_records = db.relationship('StressRecord', backref='user', lazy=True)
    baby_schedules = db.relationship('BabySchedule', backref='user', lazy=True)
    messages_sent = db.relationship('Message', foreign_keys='Message.sender_id', backref='sender', lazy=True)
    support_usage = db.relationship('SupportUsage', backref='user', lazy=True)


class EmotionRecord(db.Model):
    __tablename__ = 'emotion_records'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    record_date = db.Column(db.Date, default=date.today, nullable=False)
    emotion_score = db.Column(db.Integer, nullable=False)
    sleep_quality = db.Column(db.Integer, nullable=False)
    sleep_hours = db.Column(db.Float, default=0)
    note = db.Column(db.Text, default='')
    self_assessment = db.Column(db.Integer, default=5)
    created_at = db.Column(db.DateTime, default=datetime.now)

    stress_items = db.relationship('StressRecord', backref='emotion_record', lazy=True)
    support_items = db.relationship('SupportUsage', backref='emotion_record', lazy=True)


class StressRecord(db.Model):
    __tablename__ = 'stress_records'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    emotion_record_id = db.Column(db.Integer, db.ForeignKey('emotion_records.id'))
    stress_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.Integer, default=3)
    description = db.Column(db.Text, default='')
    record_date = db.Column(db.Date, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.now)


class SupportUsage(db.Model):
    __tablename__ = 'support_usage'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    emotion_record_id = db.Column(db.Integer, db.ForeignKey('emotion_records.id'))
    support_type = db.Column(db.String(50), nullable=False)
    used = db.Column(db.Boolean, default=False)
    helpfulness = db.Column(db.Integer, default=0)
    record_date = db.Column(db.Date, default=date.today)
    created_at = db.Column(db.DateTime, default=datetime.now)


class Message(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.Integer, nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_anonymous = db.Column(db.Boolean, default=True)
    is_viewed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)


class BabySchedule(db.Model):
    __tablename__ = 'baby_schedules'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    record_date = db.Column(db.Date, default=date.today)
    sleep_total_hours = db.Column(db.Float, default=0)
    feed_count = db.Column(db.Integer, default=0)
    crying_duration = db.Column(db.Integer, default=0)
    note = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)


class CounselingResource(db.Model):
    __tablename__ = 'counseling_resources'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    contact = db.Column(db.String(200), default='')
    type = db.Column(db.String(50), default='hotline')
    is_emergency = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)


class LowMoodAlert(db.Model):
    __tablename__ = 'low_mood_alerts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    alert_date = db.Column(db.Date, default=date.today)
    consecutive_low_days = db.Column(db.Integer, default=0)
    average_score = db.Column(db.Float, default=0)
    resources_pushed = db.Column(db.Text, default='')
    is_acknowledged = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
