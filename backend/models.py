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


class CareSuggestion(db.Model):
    __tablename__ = 'care_suggestions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    suggestion_date = db.Column(db.Date, default=date.today, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending')
    priority = db.Column(db.String(20), default='normal')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)


class PostpartumVisit(db.Model):
    __tablename__ = 'postpartum_visits'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    visit_date = db.Column(db.Date, nullable=False)
    hospital = db.Column(db.String(200), default='')
    department = db.Column(db.String(100), default='')
    doctor_name = db.Column(db.String(50), default='')
    visit_type = db.Column(db.String(50), default='常规复诊')
    check_items = db.Column(db.Text, default='')
    doctor_advice = db.Column(db.Text, default='')
    status = db.Column(db.String(20), default='pending')
    result_note = db.Column(db.Text, default='')
    completed_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    medications = db.relationship('Medication', backref='visit', lazy=True)


class Medication(db.Model):
    __tablename__ = 'medications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    visit_id = db.Column(db.Integer, db.ForeignKey('postpartum_visits.id'))
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), default='处方药')
    dosage = db.Column(db.String(100), default='')
    frequency_per_day = db.Column(db.Integer, default=1)
    specific_times = db.Column(db.String(200), default='')
    start_date = db.Column(db.Date, default=date.today)
    end_date = db.Column(db.Date)
    meal_relation = db.Column(db.String(20), default='无要求')
    notes = db.Column(db.Text, default='')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    logs = db.relationship('MedicationLog', backref='medication', lazy=True)


class MedicationLog(db.Model):
    __tablename__ = 'medication_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    medication_id = db.Column(db.Integer, db.ForeignKey('medications.id'), nullable=False)
    log_date = db.Column(db.Date, default=date.today, nullable=False)
    scheduled_time = db.Column(db.String(20), default='')
    actual_time = db.Column(db.String(20), default='')
    status = db.Column(db.String(20), default='pending')
    note = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)


class AdverseReaction(db.Model):
    __tablename__ = 'adverse_reactions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    medication_id = db.Column(db.Integer, db.ForeignKey('medications.id'))
    reaction_date = db.Column(db.Date, default=date.today, nullable=False)
    symptom = db.Column(db.String(200), nullable=False)
    severity = db.Column(db.Integer, default=3)
    description = db.Column(db.Text, default='')
    duration_hours = db.Column(db.Float, default=0)
    action_taken = db.Column(db.String(200), default='')
    consulted_doctor = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)


class FeedingRecord(db.Model):
    __tablename__ = 'feeding_records'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    feed_type = db.Column(db.String(20), nullable=False)
    feed_time = db.Column(db.DateTime, default=datetime.now, nullable=False)
    duration_minutes = db.Column(db.Integer, default=0)
    breast_side = db.Column(db.String(10), default='')
    milk_amount_ml = db.Column(db.Float, default=0)
    baby_acceptance = db.Column(db.Integer, default=3)
    note = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    care_records = db.relationship('BreastCareRecord', backref='feeding_record', lazy=True)


class BreastCareRecord(db.Model):
    __tablename__ = 'breast_care_records'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    feeding_record_id = db.Column(db.Integer, db.ForeignKey('feeding_records.id'))
    record_date = db.Column(db.Date, default=date.today, nullable=False)
    care_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.Integer, default=3)
    breast_side = db.Column(db.String(10), default='both')
    description = db.Column(db.Text, default='')
    duration_hours = db.Column(db.Float, default=0)
    action_taken = db.Column(db.String(200), default='')
    consulted_doctor = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)


class LactationGoal(db.Model):
    __tablename__ = 'lactation_goals'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    goal_type = db.Column(db.String(50), nullable=False)
    target_value = db.Column(db.Float, default=0)
    current_value = db.Column(db.Float, default=0)
    unit = db.Column(db.String(20), default='')
    start_date = db.Column(db.Date, default=date.today)
    target_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='active')
    note = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)


class LactationAdvice(db.Model):
    __tablename__ = 'lactation_advices'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    advisor = db.Column(db.String(100), nullable=False)
    advisor_type = db.Column(db.String(20), default='doctor')
    content = db.Column(db.Text, nullable=False)
    advice_date = db.Column(db.Date, default=date.today)
    is_completed = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    note = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)


class FeedingAlert(db.Model):
    __tablename__ = 'feeding_alerts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    alert_type = db.Column(db.String(50), nullable=False)
    level = db.Column(db.String(20), default='info')
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    alert_date = db.Column(db.Date, default=date.today)
    is_acknowledged = db.Column(db.Boolean, default=False)
    resources_pushed = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.now)
